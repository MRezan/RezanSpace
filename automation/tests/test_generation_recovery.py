"""Regression coverage for failed hourly run 42431029813."""
import copy
import io
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import blog
from test_blog import article

class GenerationRecoveryTests(unittest.TestCase):
 def setUp(self):
  self.manifest={'key':'ai-evidence','category':'Education','sources':[{'id':1,'title':'Primary evidence','url':'https://example.com','text':'Grounded evidence'}]}
  self.outline=article();self.outline['sections']=[{'heading':'Explanation '+str(i)} for i in range(5)]
  self.paragraph=article()['sections'][0]['paragraphs'][0]
 def response(self,messages,schema,budget):
  if budget==1800:return copy.deepcopy(self.outline)
  if budget==2000:return {'paragraphs':[self.paragraph]*2}
  if budget==1000:return {'approved':True,'issues':''}
  self.fail('Unexpected generation stage')
 def test_overlong_paragraphs_repartition_without_losing_a_word(self):
  paragraphs=['Supported explanation of the process and its limitations. '*23]*2
  repaired=blog.rebalance_paragraphs({'paragraphs':paragraphs})
  from jsonschema import validate
  validate(repaired,blog.SECTION_SCHEMA)
  self.assertEqual(' '.join(paragraphs).split(),' '.join(repaired['paragraphs']).split())
 def test_short_last_paragraph_is_not_discarded(self):
  paragraphs=[self.paragraph,self.paragraph,'This final limitation matters.']
  result=blog.rebalance_paragraphs({'paragraphs':paragraphs})
  from jsonschema import validate
  validate(result,blog.SECTION_SCHEMA)
  self.assertEqual(' '.join(paragraphs).split(),' '.join(result['paragraphs']).split())
 def test_long_sentence_and_code_are_never_cut_or_padded(self):
  for paragraphs in [['A'*1500]*2,['`'+'Unclosed code. '*120,'Short note.'],['Too short.']*2]:
   original={'paragraphs':paragraphs}
   self.assertEqual(blog.rebalance_paragraphs(copy.deepcopy(original)),original)
 def test_inline_code_does_not_disable_sentence_repair(self):
  original={'paragraphs':['Use `a. b` here. '*120,'Short final limitation.']}
  result=blog.rebalance_paragraphs(original)
  from jsonschema import validate
  validate(result,blog.SECTION_SCHEMA)
  self.assertEqual(' '.join(original['paragraphs']).split(),' '.join(result['paragraphs']).split())
  self.assertEqual(sum(p.count('`a. b`') for p in result['paragraphs']),120)
  self.assertTrue(all(p.count('`')%2==0 for p in result['paragraphs']))
 def test_bengali_and_hindi_danda_boundaries_rebalance(self):
  for sentence in ['এটি তথ্যভিত্তিক ব্যাখ্যা এবং গবেষণার সীমাবদ্ধতা দেখায়।','यह प्रमाण आधारित विवरण है और शोध की सीमाओं को स्पष्ट करता है।']:
   original={'paragraphs':[sentence*25]*2}
   result=blog.rebalance_paragraphs(original)
   from jsonschema import validate
   validate(result,blog.SECTION_SCHEMA)
   self.assertEqual(''.join(original['paragraphs']),''.join(result['paragraphs']).replace('। ', '।'))
 def test_long_review_notes_never_discard_an_approved_draft(self):
  def respond(messages,schema,budget):
   if budget==1000:return {'approved':True,'issues':'Review detail. '*100}
   return self.response(messages,schema,budget)
  with patch.object(blog,'request',side_effect=respond) as request,patch('langid.classify',return_value=('en',1)):
   blog.generate(self.manifest,'en')
  self.assertEqual(sum(c.args[2]==1800 for c in request.call_args_list),1)
  self.assertEqual(sum(c.args[2]==2000 for c in request.call_args_list),5)
 def test_long_rejection_notes_still_reject_and_guide_revision(self):
  findings='Unsupported test claim. '*80
  def respond(messages,schema,budget):
   if budget==1000:return {'approved':False,'issues':findings}
   return self.response(messages,schema,budget)
  with patch.object(blog,'request',side_effect=respond) as request,patch('langid.classify',return_value=('en',1)),patch('sys.stdout',new_callable=io.StringIO) as output,self.assertRaises(blog.BlogError):
   blog.generate(self.manifest,'en')
  outlines=[c.args[0][-1]['content'] for c in request.call_args_list if c.args[2]==1800]
  self.assertIn(findings,outlines[1]);self.assertNotIn(findings,output.getvalue())
 def test_malformed_review_retries_only_review_and_preserves_checkpoint(self):
  with tempfile.TemporaryDirectory() as directory:
   checkpoint=Path(directory)/'en.progress.json'
   def respond(messages,schema,budget):
    if budget==1000:return {'approved':'yes','issues':''}
    return self.response(messages,schema,budget)
   with patch.object(blog,'request',side_effect=respond) as request,patch('langid.classify',return_value=('en',1)),patch('sys.stdout',new_callable=io.StringIO),self.assertRaises(blog.ReviewResponseError):
    blog.generate(self.manifest,'en',checkpoint=checkpoint)
   self.assertEqual(sum(c.args[2]==2000 for c in request.call_args_list),5)
   self.assertEqual(sum(c.args[2]==1000 for c in request.call_args_list),3)
   self.assertTrue(all('paragraphs' in s for s in json.loads(checkpoint.read_text())['article']['sections']))
   with patch.object(blog,'request',side_effect=self.response) as request,patch('langid.classify',return_value=('en',1)):
    blog.generate(self.manifest,'en',checkpoint=checkpoint)
   self.assertEqual([c.args[2] for c in request.call_args_list],[1000])
 def test_cjk_sentences_rebalance_without_requiring_spaces(self):
  original={'paragraphs':['これは根拠に基づく説明であり、研究の限界を示しています。'*40]*2}
  result=blog.rebalance_paragraphs(original)
  from jsonschema import validate
  validate(result,blog.SECTION_SCHEMA)
  self.assertEqual(''.join(original['paragraphs']),''.join(result['paragraphs']).replace(' ',''))
 def test_length_retry_has_measured_distinct_feedback_and_no_private_logs(self):
  responses=[{'paragraphs':['PRIVATE SHORT.']*2},{'paragraphs':['A'*1500]*2},{'paragraphs':[self.paragraph]*2}]
  with patch.object(blog,'request',side_effect=responses) as request,patch('sys.stdout',new_callable=io.StringIO) as output:
   result=blog.generate_section('instructions',{'sources':[]},'en',2)
  self.assertEqual(result,[self.paragraph]*2)
  prompts=[call.args[0][-1]['content'] for call in request.call_args_list]
  self.assertEqual(len(set(prompts)),3)
  self.assertIn('minLength',prompts[1]);self.assertIn('maxLength',prompts[2]);self.assertIn('1500',prompts[2])
  self.assertNotIn('PRIVATE SHORT',output.getvalue());self.assertIn('paragraph_lengths',output.getvalue())
 def test_wrong_language_is_repaired_before_accepting_or_checkpointing_a_section(self):
  responses=[{'paragraphs':[self.paragraph]*2}]*2
  with patch.object(blog,'request',side_effect=responses) as request,patch('langid.classify',side_effect=[('en',1),('pt',1)]),patch('sys.stdout',new_callable=io.StringIO) as output:
   blog.generate_section('instructions',{'original_section':{}},'pt-BR',0)
  prompts=[call.args[0][-1]['content'] for call in request.call_args_list]
  self.assertIn('Brazilian Portuguese',prompts[0]);self.assertIn('detected_language',prompts[1]);self.assertIn('language_mismatch',output.getvalue())
 def test_translation_requests_only_reviewed_metadata_and_current_original_section(self):
  original=article()
  with patch.object(blog,'request',side_effect=self.response) as request,patch('langid.classify',return_value=('id',1)):
   blog.generate(self.manifest,'id',original)
  outline=json.loads(request.call_args_list[0].args[0][-1]['content'].split('\nCreate metadata',1)[0])
  self.assertEqual(outline['original_metadata']['title'],original['title'])
  self.assertEqual(outline['original_headings'],[s['heading'] for s in original['sections']])
  self.assertNotIn('sources',outline);self.assertNotIn('original_article',outline)
  sections=[c for c in request.call_args_list if c.args[2]==2000]
  for index,call in enumerate(sections):
   evidence=json.loads(call.args[0][-1]['content'].split('\nWrite ONLY',1)[0])
   self.assertEqual(evidence['original_section'],original['sections'][index])
   self.assertNotIn('sources',evidence)
  review=json.loads(request.call_args_list[-1].args[0][-1]['content'])
  self.assertEqual(review['sources'],self.manifest['sources'])
  self.assertEqual(review['original'],original)
 def test_outline_correction_names_the_actual_detected_language(self):
  with patch.object(blog,'request',side_effect=self.response) as request,patch('langid.classify',side_effect=[('ms',1)]+[('id',1)]*7),patch('sys.stdout',new_callable=io.StringIO) as output:
   blog.generate(self.manifest,'id',article())
  outlines=[c.args[0][-1]['content'] for c in request.call_args_list if c.args[2]==1800]
  self.assertEqual(len(outlines),2)
  self.assertIn('detected as ms',outlines[1]);self.assertIn('Bahasa Indonesia',outlines[1])
  self.assertIn('detected_language',output.getvalue())
 def test_outline_language_mismatch_stops_before_expensive_body_generation(self):
  with patch.object(blog,'request',return_value=copy.deepcopy(self.outline)) as request,patch('langid.classify',return_value=('en',1)),patch('sys.stdout',new_callable=io.StringIO),self.assertRaises(blog.BlogError):
   blog.generate(self.manifest,'pt-BR',article())
  self.assertTrue(all(call.args[2]==1800 for call in request.call_args_list))
 def test_permanent_runtime_error_is_not_retried_as_content(self):
  with patch.object(blog,'request',side_effect=MemoryError) as request,self.assertRaises(MemoryError):
   blog.generate_section('instructions',{},'en',0)
  self.assertEqual(request.call_count,1)
 def test_exhaustion_is_bounded_with_actionable_safe_diagnostic(self):
  with patch.object(blog,'request',return_value={'paragraphs':['PRIVATE.']*2}) as request,patch('sys.stdout',new_callable=io.StringIO),self.assertRaisesRegex(blog.BlogError,'language=en, section=4, reason=minLength') as error:
   blog.generate_section('instructions',{},'en',3)
  self.assertEqual(request.call_count,3);self.assertNotIn('PRIVATE',str(error.exception))
 def test_failure_checkpoint_resumes_valid_sections_and_outline(self):
  with tempfile.TemporaryDirectory() as directory:
   checkpoint=Path(directory)/'en.progress.json';bodies=0
   def fail_second(messages,schema,budget):
    nonlocal bodies
    if budget==2000:
     bodies+=1
     if bodies>1:return {'paragraphs':['Too short.']*2}
    return self.response(messages,schema,budget)
   with patch.object(blog,'request',side_effect=fail_second),patch('sys.stdout',new_callable=io.StringIO),self.assertRaises(blog.BlogError):
    blog.generate(self.manifest,'en',checkpoint=checkpoint)
   saved=json.loads(checkpoint.read_text())
   self.assertEqual(saved['article']['sections'][0]['paragraphs'],[self.paragraph]*2)
   self.assertNotIn('paragraphs',saved['article']['sections'][1])
   with patch.object(blog,'request',side_effect=self.response) as request,patch('langid.classify',return_value=('en',1)):
    result=blog.generate(self.manifest,'en',checkpoint=checkpoint)
   self.assertNotIn(1800,[call.args[2] for call in request.call_args_list])
   self.assertEqual(sum(call.args[2]==2000 for call in request.call_args_list),4)
   blog.validate_article(result,'en',self.manifest,False)
 def test_changed_evidence_or_corrupt_checkpoint_cannot_reuse_draft(self):
  with tempfile.TemporaryDirectory() as directory:
   checkpoint=Path(directory)/'en.progress.json'
   for saved in [{'fingerprint':'different-evidence','article':article()}, {'fingerprint':blog.generation_fingerprint(self.manifest,'en',None),'article':{'sections':[]}}]:
    blog.save(checkpoint,saved)
    with patch.object(blog,'request',side_effect=self.response) as request,patch('langid.classify',return_value=('en',1)),patch('sys.stdout',new_callable=io.StringIO):
     blog.generate(self.manifest,'en',checkpoint=checkpoint)
    self.assertEqual(request.call_args_list[0].args[2],1800)
 def test_evidence_review_rejection_clears_partial_checkpoint(self):
  with tempfile.TemporaryDirectory() as directory:
   checkpoint=Path(directory)/'en.progress.json'
   def reject(messages,schema,budget):
    if budget==1000:return {'approved':False,'issues':'unsupported claim'}
    return self.response(messages,schema,budget)
   with patch.object(blog,'request',side_effect=reject),patch('langid.classify',return_value=('en',1)),patch('sys.stdout',new_callable=io.StringIO),self.assertRaises(blog.BlogError):
    blog.generate(self.manifest,'en',checkpoint=checkpoint)
   self.assertIsNone(json.loads(checkpoint.read_text())['article'])
   self.assertIn('unsupported claim',json.loads(checkpoint.read_text())['revision_feedback'])
   with patch.object(blog,'request',side_effect=self.response) as request,patch('langid.classify',return_value=('en',1)):
    blog.generate(self.manifest,'en',checkpoint=checkpoint)
   self.assertIn('unsupported claim',request.call_args_list[0].args[0][-1]['content'])
 def test_cli_removes_progress_only_after_reviewed_output_is_saved(self):
  with tempfile.TemporaryDirectory() as directory:
   work=Path(directory);blog.save(work/'manifest.json',self.manifest)
   blog.save(work/'en.progress.json',{'partial':'saved'})
   with patch.object(sys,'argv',['blog.py','english','--work',directory]),patch.object(blog,'generate',return_value=article()) as generate:
    blog.main()
   self.assertTrue((work/'en.json').is_file());self.assertFalse((work/'en.progress.json').exists())
   self.assertEqual(generate.call_args.kwargs['checkpoint'],work/'en.progress.json')
 def test_invalid_outline_retries_without_generating_or_publishing_sections(self):
  invalid=copy.deepcopy(self.outline);invalid['excerpt']='Tiny.'
  with patch.object(blog,'request',return_value=invalid) as request,self.assertRaises(blog.BlogError):
   blog.generate(self.manifest,'en')
  self.assertEqual(request.call_count,2)
  self.assertTrue(all(call.args[2]==1800 for call in request.call_args_list))

if __name__=='__main__':unittest.main()
