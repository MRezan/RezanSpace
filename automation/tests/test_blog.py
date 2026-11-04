import copy
import importlib.util
import json
from pathlib import Path
import unittest
from unittest.mock import patch

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('blog',ROOT/'blog.py');blog=importlib.util.module_from_spec(spec);spec.loader.exec_module(blog)
spec2=importlib.util.spec_from_file_location('deploy',ROOT/'deploy.py');deploy=importlib.util.module_from_spec(spec2);spec2.loader.exec_module(deploy)

def article():
 return {'title':'A practical introduction to solar electricity','excerpt':'Learn how sunlight becomes useful electricity, and where a solar panel system has practical limitations.','image_prompt':'An editorial illustration of solar panels on an ordinary rooftop in natural daylight, no text or logos.','image_alt':'An illustration of solar panels on a rooftop.','sections':[{'heading':'A useful explanation '+str(i),'paragraphs':['Solar cells convert incoming sunlight into electrical energy. This explanation describes the process and practical limitations without claiming to measure a specific installation. '*3],'source_ids':[1]} for i in range(5)]}

class BlogTests(unittest.TestCase):
 def setUp(self):self.manifest={'key':blog.source_key('https://www.nasa.gov/example/'),'category':'Science','sources':[{'id':1,'url':'https://www.nasa.gov/example/','title':'NASA source','text':'Source evidence'}]}
 def test_fifteen_languages_match_frontend(self):
  self.assertEqual(len(blog.LANGUAGES),15)
  frontend=(ROOT.parent/'lib/i18n/locales.ts').read_text()
  for locale in blog.LANGUAGES:self.assertIn("'"+locale+"'",frontend)
 def test_identical_source_reuses_translation_identity(self):
  self.assertEqual(blog.payload(article(),self.manifest,'bn')['slug'],self.manifest['key']+'-bn')
  self.assertEqual(blog.payload(article(),self.manifest,'en')['translation_key'],blog.payload(article(),self.manifest,'bn')['translation_key'])
 def test_generation_has_sources_and_escapes_html(self):
  value=article();value['sections'][0]['heading']='<script>alert(1)</script>'
  rendered=blog.render_content(value,self.manifest,'en')
  self.assertNotIn('<script>',rendered);self.assertIn('&lt;script&gt;',rendered);self.assertIn('https://www.nasa.gov/example/',rendered)
 def test_unknown_source_ids_are_rejected(self):
  value=article();value['sections'][0]['source_ids']=[2]
  with self.assertRaises(blog.BlogError):blog.validate_article(value,'en',self.manifest,False)
 def test_invented_urls_are_rejected(self):
  value=article();value['sections'][0]['paragraphs'][0]+=' https://invented.invalid/'
  with self.assertRaises(blog.BlogError):blog.validate_article(value,'en',self.manifest,False)
 def test_valid_article_passes_structural_checks(self):blog.validate_article(article(),'en',self.manifest,False)
 def test_duplicate_headline_is_rejected(self):
  self.manifest['recent_titles']=[article()['title']]
  with self.assertRaises(blog.BlogError):blog.validate_article(article(),'en',self.manifest,False)
 def test_sources_cannot_redirect_to_arbitrary_hosts(self):
  self.assertFalse(blog.allowed_url('https://www.nasa.gov.attacker.test/x',['www.nasa.gov']))
  self.assertFalse(blog.allowed_url('http://www.nasa.gov/x',['www.nasa.gov']))
  self.assertFalse(blog.allowed_url('https://user:secret@www.nasa.gov/x',['www.nasa.gov']))
  self.assertTrue(blog.allowed_url('https://www.nasa.gov/x',['www.nasa.gov']))
 def test_ftps_requires_credentials_and_exact_directory(self):
  with patch.dict('os.environ',{},clear=True):
   with self.assertRaises(RuntimeError):deploy.config()
  values={'REZAN_FTP_HOST':'ftpupload.net','REZAN_FTP_USER':'example','REZAN_FTP_PASSWORD':'example','REZAN_FTP_DIRECTORY':'../htdocs'}
  with patch.dict('os.environ',values,clear=True):
   with self.assertRaises(RuntimeError):deploy.config()
 def test_backend_packaging_preserves_config_and_user_media(self):
  paths=[destination for _,destination in deploy.managed_files(True)]
  self.assertIn('api/automation-media.php',paths);self.assertIn('lib/automation-auth.php',paths);self.assertNotIn('config.php',paths);self.assertFalse(any(path.startswith('uploads/') for path in paths))

if __name__=='__main__':unittest.main()
