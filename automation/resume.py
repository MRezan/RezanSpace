"""Validate and reuse completed artifacts from this repository's main-branch AI run."""
import json
import os
import re
import urllib.request
from blog import LANGUAGES

def validate_checkpoint(run,artifacts,repository):
 if run.get('head_repository',{}).get('full_name')!=repository or run.get('head_branch')!='main':
  raise ValueError('Resume checkpoints must come from this repository main branch')
 if run.get('event') not in ['workflow_dispatch','schedule'] or run.get('path','').split('@')[0]!='.github/workflows/ai-blog.yml':
  raise ValueError('Resume checkpoints must come from the AI blog workflow')
 available={artifact['name'] for artifact in artifacts if not artifact.get('expired',False)}
 if 'blog-base' not in available:raise ValueError('Source run has no retained English/source checkpoint')
 return {'cover':'blog-cover' in available,'languages':[language for language in LANGUAGES if 'blog-language-'+language in available]}

def main():
 repository=os.environ['GITHUB_REPOSITORY'];run_id=os.environ['RESUME_RUN_ID']
 if not re.fullmatch(r'[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+',repository) or not run_id.isdigit():raise ValueError('Invalid repository or resume run ID')
 token=os.environ['GH_TOKEN'];base='https://api.github.com/repos/'+repository
 def get(path):
  request=urllib.request.Request(base+path,headers={'Authorization':'Bearer '+token,'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'})
  with urllib.request.urlopen(request,timeout=30) as response:return json.load(response)
 run=get('/actions/runs/'+run_id)
 if not run.get('path'):run['path']=get('/actions/workflows/'+str(run['workflow_id']))['path']
 artifacts=[];page=1
 while True:
  batch=get('/actions/runs/'+run_id+'/artifacts?per_page=100&page='+str(page))['artifacts'];artifacts.extend(batch)
  if len(batch)<100:break
  page+=1
 result=validate_checkpoint(run,artifacts,repository)
 with open(os.environ['GITHUB_OUTPUT'],'a') as stream:
  stream.write('cover='+str(result['cover']).lower()+'\n')
  stream.write('languages='+json.dumps(result['languages'])+'\n')
 print('Verified source checkpoint; reusing '+str(len(result['languages']))+' completed languages and '+('the existing illustration.' if result['cover'] else 'generating the missing illustration.'))

if __name__=='__main__':main()
