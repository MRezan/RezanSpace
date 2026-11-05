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
  jobs=workflow['jobs'];strategy=jobs['translations']['strategy']
  self.assertEqual(strategy['max-parallel'],20)
  self.assertEqual(set(strategy['matrix']['language']),set(blog.LANGUAGES))
  self.assertEqual(len(batch.TOPICS)*len(strategy['matrix']['language']),240)
  self.assertIn('illustrations',jobs['translations']['needs'])
  self.assertIn('translations',jobs['publish']['needs'])
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

if __name__=='__main__':unittest.main()
