import importlib.util
import json
import re
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
import batch
import blog

class BatchTests(unittest.TestCase):
 def test_catalog_covers_each_frontend_category_and_approved_sources(self):
  frontend=(ROOT.parent/'app/categories.ts').read_text()
  sources=json.loads((ROOT/'sources.json').read_text())
  frontend_categories=re.search(r'categories=\[([^\]]+)\] as const',frontend).group(1)
  self.assertEqual({topic['name'] for topic in batch.TOPICS},set(re.findall(r"'([^']+)'",frontend_categories)))
  self.assertEqual(len(batch.TOPICS),16)
  for topic in batch.TOPICS:
   self.assertIn("'"+topic['name']+"'",frontend)
   self.assertEqual(topic['slug'],re.sub(r'[^a-z0-9]+','-',topic['name'].lower()).strip('-'))
   self.assertTrue(any(source['category']==topic['name'] for source in sources),topic['name'])
  self.assertEqual(len({topic['slug'] for topic in batch.TOPICS}),16)
 def test_missing_or_duplicate_category_cannot_publish(self):
  for invalid in [batch.TOPICS[:-1],batch.TOPICS+[batch.TOPICS[0]],list(reversed(batch.TOPICS))]:
   with self.assertRaises(blog.BlogError):batch.validate_plan(invalid)
 def prepare(self,work):
  blog.save(work/'batch.json',batch.TOPICS)
  article={'image_alt':'An illustrative source-grounded image','title':'A useful source-grounded explanation','excerpt':'A practical source-grounded introduction.','sections':[{'heading':'Explanation','paragraphs':['Evidence-based original explanation.'],'source_ids':[1]}]}
  for topic in batch.TOPICS:
   folder=work/'topics'/topic['slug']
   blog.save(folder/'manifest.json',{'key':'ai-'+topic['slug'],'category':topic['name'],'sources':[{'id':1,'url':'https://example.com/evidence','title':'Primary evidence'}]})
   (folder/'cover.webp').write_bytes(b'fixture')
   for language in blog.LANGUAGES:blog.save(folder/(language+'.json'),article)
 def test_full_batch_preserves_every_category_language_and_unique_slug(self):
  with tempfile.TemporaryDirectory() as directory:
   work=Path(directory);self.prepare(work)
   with patch.object(blog,'validate_article') as validate:batch.assemble(work)
   self.assertEqual(validate.call_count,240)
   posts=[post for topic in batch.TOPICS for post in json.loads((work/'topics'/topic['slug']/'payload.json').read_text())['posts']]
   self.assertEqual(len({post['slug'] for post in posts}),240)
   for topic in batch.TOPICS:self.assertEqual({post['language'] for post in posts if post['category']==topic['name']},set(blog.LANGUAGES))
 def test_publication_pen_names_are_stable_and_shared_by_translations(self):
  first=blog.publication_author('ai-topic-one');second=blog.publication_author('ai-topic-two')
  self.assertNotEqual(first,'REZAN AI Editorial');self.assertNotEqual(first,second)
  self.assertRegex(first,r'^[A-Za-z]+ [A-Z]\. [A-Za-z]+$')
  self.assertEqual(first,blog.publication_author('ai-topic-one'))
  article={'title':'Example','excerpt':'Example excerpt','image_alt':'Example image','sections':[]}
  manifest={'key':'ai-topic-one','category':'Science','sources':[]}
  self.assertEqual(blog.payload(article,manifest,'en')['author'],blog.payload(article,manifest,'bn')['author'])
 def test_tutorial_code_is_accepted_while_prose_links_and_html_are_rejected(self):
  blog.validate_plain_paragraphs(['Use the <dialog> element and call `showModal()` for the example.'])
  blog.validate_plain_paragraphs(['The example origin is `https://example.com` and the literal tag is `<button>`.'])
  for invalid in ['Read https://invented.invalid as proof.','<div class="article">Rich HTML wrapper</div>']:
   with self.assertRaises(blog.BlogError):blog.validate_plain_paragraphs([invalid])
 def test_recovery_accepts_only_trusted_retained_category_artifacts(self):
  import resume_batch
  run={'head_repository':{'full_name':'MRezan/RezanSpace'},'head_branch':'main','event':'workflow_dispatch','path':'.github/workflows/hourly-blog.yml'}
  artifacts=[{'name':'batch-plan'},{'name':'category-original-technology'},{'name':'category-cover-technology','expired':True},{'name':'category-language-technology-bn'},{'name':'category-progress-education-en'},{'name':'category-progress-culture-fr','expired':True}]
  result=resume_batch.validate_batch_checkpoint(run,artifacts,'MRezan/RezanSpace')
  self.assertEqual(result,{'originals':['technology'],'progress':['education-en'],'covers':[],'languages':['technology-bn']})
  with self.assertRaises(ValueError):resume_batch.validate_batch_checkpoint({**run,'head_branch':'untrusted'},artifacts,'MRezan/RezanSpace')
  with self.assertRaises(ValueError):resume_batch.validate_batch_checkpoint(run,artifacts[1:],'MRezan/RezanSpace')
 def test_publish_build_uses_current_main_without_deleting_generated_outputs(self):
  import yaml
  workflow=yaml.safe_load((ROOT.parent/'.github/workflows/hourly-blog.yml').read_text())
  checkouts=[step for step in workflow['jobs']['publish']['steps'] if step.get('uses')=='actions/checkout@v5' and step.get('with',{}).get('ref')=='main']
  self.assertEqual(len(checkouts),1);self.assertIs(checkouts[0]['with']['clean'],False)
 def test_invalid_prose_is_repaired_in_its_section_without_regenerating_valid_sections(self):
  import copy
  from test_blog import article
  outline=article();outline['sections']=[{'heading':'Explanation '+str(i)} for i in range(5)];calls=[]
  def request(messages,schema,budget):
   calls.append(budget)
   if budget==1800:return copy.deepcopy(outline)
   if budget==2000:
    paragraphs=[article()['sections'][0]['paragraphs'][0]]*2
    if calls.count(2000)==1:paragraphs[0]+=' https://invented.invalid'
    return {'paragraphs':paragraphs}
   return {'approved':True,'issues':''}
  manifest={'key':'evidence','category':'Technology','sources':[{'id':1,'url':'https://example.com','title':'Evidence','text':'Primary evidence'}]}
  with patch.object(blog,'request',side_effect=request),patch('langid.classify',return_value=('en',1)):
   result=blog.generate(manifest,'en')
  self.assertEqual(calls.count(1800),1);self.assertEqual(calls.count(2000),6)
  self.assertNotIn('invented.invalid',json.dumps(result))
 def test_both_generation_phases_preserve_and_restore_partial_checkpoints(self):
  import yaml
  workflow=yaml.safe_load((ROOT.parent/'.github/workflows/hourly-blog.yml').read_text())
  for name in ['originals','generation']:
   steps=workflow['jobs'][name]['steps']
   upload=[step for step in steps if step.get('uses')=='actions/upload-artifact@v6' and step.get('with',{}).get('path')=='progress-artifact']
   self.assertEqual(len(upload),1);self.assertIn('always()',upload[0]['if'])
   restore=[step for step in steps if step.get('name')=='Restore partial validated sections from the source run']
   self.assertEqual(len(restore),1);self.assertIn('resume_progress',restore[0]['if'])
 def test_missing_translation_blocks_the_batch(self):
  with tempfile.TemporaryDirectory() as directory:
   work=Path(directory);self.prepare(work)
   (work/'topics'/batch.TOPICS[0]['slug']/'bn.json').unlink()
   with patch.object(blog,'validate_article'),self.assertRaises(FileNotFoundError):batch.assemble(work)
 def test_shared_translation_identity_between_categories_is_rejected(self):
  with tempfile.TemporaryDirectory() as directory:
   work=Path(directory);self.prepare(work)
   for topic in batch.TOPICS[:2]:
    p=work/'topics'/topic['slug']/'manifest.json';value=json.loads(p.read_text());value['key']='same';blog.save(p,value)
   with patch.object(blog,'validate_article'),self.assertRaises(blog.BlogError):batch.assemble(work)
 def test_hourly_matrix_and_concurrency_cover_the_full_cross_product(self):
  import yaml
  workflow=yaml.safe_load((ROOT.parent/'.github/workflows/hourly-blog.yml').read_text())
  trigger=workflow.get('on',workflow.get(True))
  self.assertEqual(trigger['schedule'],[{'cron':'17 * * * *'}])
  self.assertEqual(workflow['concurrency']['queue'],'max')
  jobs=workflow['jobs'];strategy=jobs['generation']['strategy']
  self.assertEqual(strategy['max-parallel'],20)
  self.assertEqual(set(strategy['matrix']['language']),{'cover'}|set(blog.LANGUAGES)-{'en'})
  self.assertEqual(len(batch.TOPICS)*len(strategy['matrix']['language']),240)
  self.assertEqual(jobs['generation']['needs'],['prepare','originals'])
  self.assertNotIn('illustrations',jobs)
  self.assertIn('generation',jobs['publish']['needs'])
  self.assertFalse(jobs['generation']['strategy']['fail-fast'])
  # Original artifacts supply English; the shared matrix supplies each cover
  # and every other language exactly once without duplicate copy jobs.
  tasks=[(topic['slug'],language) for topic in batch.TOPICS for language in strategy['matrix']['language']]
  self.assertLessEqual(len(tasks),256)
  self.assertEqual(sum(language=='cover' for _,language in tasks),16)
  articles={(topic['slug'],'en') for topic in batch.TOPICS}|{(topic,language) for topic,language in tasks if language!='cover'}
  self.assertEqual(articles,{(topic['slug'],language) for topic in batch.TOPICS for language in blog.LANGUAGES})
  self.assertIn('sitemap',str(jobs['publish']['steps']).lower())

class DeploymentTests(unittest.TestCase):
 def test_unchanged_files_are_skipped_and_sitemap_is_committed_last(self):
  import deploy
  from unittest.mock import MagicMock
  with tempfile.TemporaryDirectory() as directory:
   root=Path(directory);asset=root/'asset.js';asset.write_text('chunk');page=root/'page.html';page.write_text('page');sitemap=root/'sitemap.xml';sitemap.write_text('<urlset/>')
   ftp=MagicMock();ftp.__enter__.return_value=ftp
   ftp.retrbinary.side_effect=lambda command,append:append(json.dumps({'_next/asset.js':deploy.file_digest(asset)}).encode())
   files=[(sitemap,'sitemap.xml'),(page,'en/index.html'),(asset,'_next/asset.js')]
   config={'REZAN_FTP_HOST':'example.invalid','REZAN_FTP_USER':'test','REZAN_FTP_PASSWORD':'test','REZAN_FTP_DIRECTORY':'rezan.space/htdocs'}
   with patch.object(deploy,'config',return_value=config),patch.object(deploy,'managed_files',return_value=iter(files)),patch.object(deploy.ftplib,'FTP_TLS',return_value=ftp):deploy.deploy()
   commands=[call.args[0] for call in ftp.storbinary.call_args_list]
   self.assertEqual(commands,['STOR en/index.html.uploading','STOR sitemap.xml.uploading','STOR '+deploy.MANIFEST+'.uploading'])
 def test_failed_upload_does_not_commit_a_new_deployment_manifest(self):
  import deploy
  from unittest.mock import MagicMock
  with tempfile.TemporaryDirectory() as directory:
   source=Path(directory)/'page';source.write_text('page')
   ftp=MagicMock();ftp.__enter__.return_value=ftp;ftp.retrbinary.side_effect=deploy.ftplib.error_perm('550 Missing');ftp.storbinary.side_effect=OSError('connection lost')
   config={'REZAN_FTP_HOST':'example.invalid','REZAN_FTP_USER':'test','REZAN_FTP_PASSWORD':'test','REZAN_FTP_DIRECTORY':'rezan.space/htdocs'}
   with patch.object(deploy,'config',return_value=config),patch.object(deploy,'managed_files',return_value=iter([(source,'en/index.html')])),patch.object(deploy.ftplib,'FTP_TLS',return_value=ftp),self.assertRaises(OSError):deploy.deploy()
   self.assertFalse(any(deploy.MANIFEST in call.args[0] for call in ftp.storbinary.call_args_list))

 def test_transfer_sessions_are_bounded_and_assets_finish_before_html(self):
  import deploy
  import threading
  import time
  lock=threading.Lock();active=0;peak=0;commands=[]
  class FTP:
   def __init__(self,**kwargs):pass
   def __enter__(self):
    nonlocal active,peak
    with lock:active+=1;peak=max(peak,active)
    return self
   def __exit__(self,*args):
    nonlocal active
    with lock:active-=1
   def connect(self,*args):pass
   def login(self,*args):pass
   def prot_p(self):pass
   def cwd(self,*args):pass
   def mkd(self,*args):pass
   def rename(self,*args):pass
   def retrbinary(self,command,append):append(b'{}')
   def storbinary(self,command,stream,**kwargs):
    with lock:commands.append(command)
    time.sleep(.01)
  with tempfile.TemporaryDirectory() as directory:
   root=Path(directory);files=[]
   for name in ['_next/a.js','_next/b.js','en/index.html','bn/index.html','sitemap.xml']:
    source=root/name;source.parent.mkdir(parents=True,exist_ok=True);source.write_text(name);files.append((source,name))
   config={'REZAN_FTP_HOST':'example.invalid','REZAN_FTP_USER':'test','REZAN_FTP_PASSWORD':'test','REZAN_FTP_DIRECTORY':'rezan.space/htdocs'}
   with patch.object(deploy,'config',return_value=config),patch.object(deploy,'managed_files',return_value=iter(files)),patch.object(deploy.ftplib,'FTP_TLS',FTP):deploy.deploy()
   self.assertEqual(peak,2);self.assertEqual(active,0)
   self.assertTrue(all('_next/' in command for command in commands[:2]))
   self.assertEqual(commands[-2],'STOR sitemap.xml.uploading')
   self.assertEqual(commands[-1],'STOR '+deploy.MANIFEST+'.uploading')

if __name__=='__main__':unittest.main()
