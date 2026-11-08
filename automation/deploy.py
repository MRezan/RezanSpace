"""Upload only managed static/backend files using verified explicit FTPS."""
import argparse
import ftplib
import hashlib
import json
import os
from pathlib import Path,PurePosixPath
import ssl
from contextlib import contextmanager
from concurrent.futures import ThreadPoolExecutor
from threading import Event,Lock

ROOT=Path(__file__).resolve().parents[1]
def config():
 values={name:os.environ.get(name,'') for name in ['REZAN_FTP_HOST','REZAN_FTP_USER','REZAN_FTP_PASSWORD','REZAN_FTP_DIRECTORY']}
 if not all(values.values()):raise RuntimeError('Hosting FTPS secrets are missing')
 directory=PurePosixPath(values['REZAN_FTP_DIRECTORY'])
 if '..' in directory.parts or directory.parts[-2:]!=('rezan.space','htdocs'):raise RuntimeError('Deploy directory must be the exact site htdocs directory')
 return values

def managed_files(backend_only=False):
 if not backend_only:
  out=ROOT/'out'
  if not (out/'sitemap.xml').is_file() or not (out/'en/index.html').is_file():raise RuntimeError('A complete multilingual build is required')
  yield from ((file,file.relative_to(out).as_posix()) for file in out.rglob('*') if file.is_file())
 for folder in ['api','lib']:
  yield from ((file,file.relative_to(ROOT/'backend').as_posix()) for file in (ROOT/'backend'/folder).rglob('*.php'))
 yield ROOT/'backend/bootstrap.php','bootstrap.php'
 yield ROOT/'backend/.htaccess','.htaccess'

MANIFEST='.rezan-deploy-manifest.json'
PROGRESS='.rezan-deploy-progress.json'

def file_digest(path):
 digest=hashlib.sha256()
 with path.open('rb') as stream:
  for chunk in iter(lambda:stream.read(131072),b''):digest.update(chunk)
 return digest.hexdigest()

def read_json(ftp,name):
 content=bytearray()
 def append(chunk):
  if len(content)+len(chunk)>10_000_000:raise ValueError('Deployment metadata is too large')
  content.extend(chunk)
 try:
  ftp.retrbinary('RETR '+name,append)
  return json.loads(content)
 except (ftplib.error_perm,ValueError,UnicodeDecodeError):return {}

def valid_hashes(value):
 return isinstance(value,dict) and all(isinstance(k,str) and isinstance(v,str) for k,v in value.items())

def previous_hashes(ftp):
 value=read_json(ftp,MANIFEST)
 return value if valid_hashes(value) else {}

def manifest_identity(value):
 return hashlib.sha256(json.dumps(value,sort_keys=True).encode()).hexdigest()

def progress_hashes(ftp,previous):
 value=read_json(ftp,PROGRESS)
 if not isinstance(value,dict) or value.get('base')!=manifest_identity(previous):return {}
 completed=value.get('completed')
 return completed if valid_hashes(completed) else {}

def write_json(ftp,name,value):
 import io
 ftp.storbinary('STOR '+name+'.uploading',io.BytesIO(json.dumps(value,sort_keys=True).encode()),blocksize=131072)
 ftp.rename(name+'.uploading',name)

@contextmanager
def ftp_session(values):
 with ftplib.FTP_TLS(context=ssl.create_default_context(),timeout=45) as ftp:
  ftp.connect(values['REZAN_FTP_HOST'],21);ftp.login(values['REZAN_FTP_USER'],values['REZAN_FTP_PASSWORD']);ftp.prot_p();ftp.cwd(values['REZAN_FTP_DIRECTORY'])
  yield ftp

def upload_file(ftp,source,destination,directories):
 parent=PurePosixPath(destination).parent
 for index in range(1,len(parent.parts)+1):
  directory=PurePosixPath(*parent.parts[:index]).as_posix()
  if directory in directories:continue
  try:ftp.mkd(directory)
  except ftplib.error_perm as error:
   if not str(error).startswith('550'):raise
   current=ftp.pwd();ftp.cwd(directory);ftp.cwd(current)
  directories.add(directory)
 temporary=destination+'.uploading'
 with source.open('rb') as stream:ftp.storbinary('STOR '+temporary,stream,blocksize=131072)
 ftp.rename(temporary,destination)

def deploy(backend_only=False):
 values=config();files=list(managed_files(backend_only));hashes={}
 for source,destination in files:
  if source.is_symlink() or destination=='config.php' or destination.startswith('uploads/'):raise RuntimeError('Refusing to overwrite host configuration or user media')
  hashes[destination]=file_digest(source)
 with ftp_session(values) as ftp:
  previous=previous_hashes(ftp);completed=progress_hashes(ftp,previous)
 effective={**previous,**completed};progress_lock=Lock();since_checkpoint=0
 updated={**previous,**hashes};changed=[item for item in files if effective.get(item[1])!=hashes[item[1]]]
 print(f'Uploading {len(changed)} changed files; skipping {len(files)-len(changed)} identical files.',flush=True)
 stopped=Event()
 def partition(items):
  nonlocal since_checkpoint
  count=0
  try:
   with ftp_session(values) as ftp:
    directories={''}
    for source,destination in items:
     if stopped.is_set():return count
     with progress_lock:
      if completed.get(destination)==hashes[destination]:continue
     upload_file(ftp,source,destination,directories);count+=1
     with progress_lock:
      completed[destination]=hashes[destination];since_checkpoint+=1
      if since_checkpoint>=25:
       # A separate journal records only successful atomic renames. The final
       # deployment manifest still commits last, after the root sitemap.
       write_json(ftp,PROGRESS,{'base':manifest_identity(previous),'completed':completed})
       since_checkpoint=0
     if count%25==0:print('Transfer worker uploaded '+str(count)+' files.',flush=True)
  except Exception:stopped.set();raise
  return count
 # At most two authenticated FTP sessions, with no idle coordinator connection.
 # Finish every asset before publishing HTML; the root sitemap commits last.
 workers=2
 for assets in [True,False]:
  phase=sorted([item for item in changed if item[1]!='sitemap.xml' and item[1].startswith('_next/')==assets],key=lambda item:item[1])
  partitions=[phase[index::workers] for index in range(workers) if phase[index::workers]]
  if partitions:
   try:
    with ThreadPoolExecutor(max_workers=workers) as pool:list(pool.map(partition,partitions))
   except ftplib.error_temp:
    if workers==1:raise
    print('Hosting declined concurrent transfers; retrying with one session.',flush=True)
    workers=1;stopped.clear();partition(phase)
 with ftp_session(values) as ftp:
  for source,destination in changed:
   if destination=='sitemap.xml':upload_file(ftp,source,destination,{''})
  write_json(ftp,MANIFEST,updated)
 print('Managed files uploaded over verified FTPS; existing config and uploaded images preserved.')

if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--backend-only',action='store_true');parser.add_argument('--check',action='store_true');args=parser.parse_args()
 try:
  if args.check:
   values=config()
   with ftplib.FTP_TLS(context=ssl.create_default_context(),timeout=45) as ftp:
    ftp.connect(values['REZAN_FTP_HOST'],21);ftp.login(values['REZAN_FTP_USER'],values['REZAN_FTP_PASSWORD']);ftp.prot_p();ftp.cwd(values['REZAN_FTP_DIRECTORY'])
   print('Verified hosting FTPS login and deployment directory.')
  else:deploy(args.backend_only)
 except Exception as error:raise SystemExit('FTPS deployment failed ('+type(error).__name__+'); inspect hosting connectivity and credentials.') from None
