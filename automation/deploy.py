"""Upload only managed static/backend files using verified explicit FTPS."""
import argparse
import ftplib
import os
from pathlib import Path,PurePosixPath
import ssl

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

def deploy(backend_only=False):
 values=config()
 with ftplib.FTP_TLS(context=ssl.create_default_context(),timeout=45) as ftp:
  ftp.connect(values['REZAN_FTP_HOST'],21);ftp.login(values['REZAN_FTP_USER'],values['REZAN_FTP_PASSWORD']);ftp.prot_p();ftp.cwd(values['REZAN_FTP_DIRECTORY'])
  directories={''}
  files=list(managed_files(backend_only))
  # New chunk assets arrive before HTML that references them; sitemap is uploaded last.
  files.sort(key=lambda item:(2 if item[1]=='sitemap.xml' else 0 if item[1].startswith('_next/') else 1,item[1]))
  for source,destination in files:
   if source.is_symlink() or destination=='config.php' or destination.startswith('uploads/'):raise RuntimeError('Refusing to overwrite host configuration or user media')
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
