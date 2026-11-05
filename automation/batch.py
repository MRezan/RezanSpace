"""Plan and validate complete category × language publishing batches."""
import argparse
from concurrent.futures import ThreadPoolExecutor
import json
import os
from pathlib import Path
import blog

TOPICS=json.loads((blog.ROOT/'topics.json').read_text())

def validate_plan(plan):
 if not isinstance(plan,list) or [(t.get('slug'),t.get('name')) for t in plan]!=[(t['slug'],t['name']) for t in TOPICS]:
  raise blog.BlogError('Batch must contain every configured category exactly once')
 return plan

def make_plan(work):
 target=work/'batch.json'
 if target.exists():return validate_plan(json.loads(target.read_text()))
 snapshot=json.loads((work/'snapshot.json').read_text())
 def select(topic):
  output=work/'topics'/topic['slug']/'manifest.json'
  if not output.exists() and not blog.plan(snapshot,output,topic['name']):
   raise blog.BlogError('No unpublished evidence available for '+topic['name'])
  return topic
 # Fetch independent category evidence concurrently; inference runs in separate jobs.
 with ThreadPoolExecutor(max_workers=16) as pool:list(pool.map(select,TOPICS))
 reserved=list(snapshot)
 for topic in TOPICS:
  path=work/'topics'/topic['slug']/'manifest.json'
  manifest=json.loads(path.read_text())
  if manifest['key'] in {p.get('translation_key') for p in reserved}:
   if not blog.plan(reserved,path,topic['name']):raise blog.BlogError('Distinct evidence unavailable for '+topic['name'])
   manifest=json.loads(path.read_text())
  if manifest['category']!=topic['name']:raise blog.BlogError('Evidence category mismatch')
  reserved.append({'translation_key':manifest['key'],'title':manifest['sources'][0]['title'],'language':'en'})
 blog.save(target,TOPICS)
 return TOPICS

def assemble(work):
 topics=validate_plan(json.loads((work/'batch.json').read_text()));slugs=set()
 for topic in topics:
  folder=work/'topics'/topic['slug'];manifest=json.loads((folder/'manifest.json').read_text())
  if manifest['category']!=topic['name']:raise blog.BlogError('Category does not match publishing plan')
  if not (folder/'cover.webp').is_file():raise blog.BlogError('Missing category illustration')
  posts=[]
  for language in blog.LANGUAGES:
   article=json.loads((folder/(language+'.json')).read_text())
   blog.validate_article(article,language,manifest)
   post=blog.payload(article,manifest,language)
   if post['slug'] in slugs:raise blog.BlogError('Duplicate article in batch')
   slugs.add(post['slug']);posts.append(post)
  blog.save(folder/'payload.json',{'create_missing_categories':True,'on_conflict':'skip','posts':posts})
 if len(slugs)!=len(TOPICS)*len(blog.LANGUAGES):raise blog.BlogError('Incomplete category/language coverage')
 print(f'Validated {len(TOPICS)} categories × {len(blog.LANGUAGES)} languages = {len(slugs)} articles.')

def main():
 parser=argparse.ArgumentParser();parser.add_argument('stage',choices=['plan','assemble']);parser.add_argument('--work',default='work/blog');args=parser.parse_args();work=Path(args.work)
 if args.stage=='assemble':assemble(work);return
 topics=make_plan(work)
 if os.getenv('GITHUB_OUTPUT'):
  with open(os.environ['GITHUB_OUTPUT'],'a') as stream:
   stream.write('topics='+json.dumps([t['slug'] for t in topics])+'\n')
 print('Selected distinct source evidence for all '+str(len(topics))+' categories.')

if __name__=='__main__':main()
