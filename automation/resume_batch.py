"""Reuse validated category artifacts from an earlier trusted main-branch run."""
import json
import os
import re
import urllib.request
from batch import TOPICS
from blog import LANGUAGES

def validate_batch_checkpoint(run,artifacts,repository):
 if run.get('head_repository',{}).get('full_name')!=repository or run.get('head_branch')!='main':raise ValueError('Source run must belong to this repository main branch')
 if run.get('event') not in ['workflow_dispatch','schedule','push'] or run.get('path','').split('@')[0]!='.github/workflows/hourly-blog.yml':raise ValueError('Source must be an all-category publishing run')
 names={item['name'] for item in artifacts if not item.get('expired',False)}
 if 'batch-plan' not in names:raise ValueError('Source run has no retained batch plan')
 return {
  'originals':[t['slug'] for t in TOPICS if 'category-original-'+t['slug'] in names],
  'progress':[t['slug']+'-'+lang for t in TOPICS for lang in LANGUAGES if 'category-progress-'+t['slug']+'-'+lang in names],
  'covers':[t['slug'] for t in TOPICS if 'category-cover-'+t['slug'] in names],
  'languages':[t['slug']+'-'+lang for t in TOPICS for lang in LANGUAGES if 'category-language-'+t['slug']+'-'+lang in names]
 }

def main():
 repository=os.environ['GITHUB_REPOSITORY'];run_id=os.environ['RESUME_RUN_ID']
 if not re.fullmatch(r'[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+',repository) or not run_id.isdigit():raise ValueError('Invalid repository or source run ID')
 def get(path):
  request=urllib.request.Request('https://api.github.com/repos/'+repository+path,headers={'Authorization':'Bearer '+os.environ['GH_TOKEN'],'Accept':'application/vnd.github+json'})
  with urllib.request.urlopen(request,timeout=30) as response:return json.load(response)
 run=get('/actions/runs/'+run_id)
 if not run.get('path'):run['path']=get('/actions/workflows/'+str(run['workflow_id']))['path']
 artifacts=[];page=1
 while True:
  items=get('/actions/runs/'+run_id+'/artifacts?per_page=100&page='+str(page))['artifacts'];artifacts.extend(items)
  if len(items)<100:break
  page+=1
 result=validate_batch_checkpoint(run,artifacts,repository)
 with open(os.environ['GITHUB_OUTPUT'],'a') as stream:
  for key,value in result.items():stream.write(key+'='+json.dumps(value)+'\n')
 print(f"Reusing {len(result['originals'])} originals, {len(result['covers'])} illustrations and {len(result['languages'])} language outputs.")

if __name__=='__main__':main()
