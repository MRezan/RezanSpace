#!/usr/bin/env python3
"""Extract public article metadata. Respect a site's terms and robots.txt."""
import argparse, json, sys
from urllib.parse import urljoin, urlparse
from urllib.robotparser import RobotFileParser
import requests
from bs4 import BeautifulSoup
AGENT='RezanTechResearchBot/1.0 (+editorial research; contact: admin@example.com)'
def allowed(url):
    parsed=urlparse(url);rp=RobotFileParser(urljoin(f'{parsed.scheme}://{parsed.netloc}','/robots.txt'))
    try:rp.read();return rp.can_fetch(AGENT,url)
    except Exception:return False
def scrape(url):
    if not allowed(url):raise PermissionError('robots.txt does not allow this URL (or could not be checked).')
    r=requests.get(url,headers={'User-Agent':AGENT},timeout=15);r.raise_for_status();s=BeautifulSoup(r.text,'html.parser')
    def meta(*names):
        for name in names:
            tag=s.find('meta',attrs={'property':name}) or s.find('meta',attrs={'name':name})
            if tag and tag.get('content'):return tag['content'].strip()
        return ''
    article=s.find('article') or s.find('main');paragraphs=[p.get_text(' ',strip=True) for p in article.find_all('p')] if article else []
    return {'source_url':url,'title':meta('og:title','twitter:title') or (s.title.string.strip() if s.title and s.title.string else ''),'description':meta('og:description','description'),'author':meta('author','article:author'),'image':urljoin(url,meta('og:image','twitter:image')),'text':'\n\n'.join(p for p in paragraphs if len(p)>40)}
if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('url');parser.add_argument('-o','--output');args=parser.parse_args()
    try:
        result=json.dumps(scrape(args.url),ensure_ascii=False,indent=2)
        if args.output:open(args.output,'w',encoding='utf-8').write(result+'\n')
        else:print(result)
    except Exception as exc:print(f'Error: {exc}',file=sys.stderr);sys.exit(1)
