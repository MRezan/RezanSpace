/** Verify the rendered document after the host's ordinary browser challenge. */
export function metadataFailure(actual,expectedUrl,expectedLanguage){
 if(actual.status!==null&&(actual.status<200||actual.status>=300))return `HTTP ${actual.status}`;
 if((actual.language||'').toLowerCase()!==expectedLanguage.toLowerCase())return `language ${JSON.stringify(actual.language)} (expected ${expectedLanguage})`;
 let canonical;try{canonical=new URL(actual.canonical,expectedUrl).href;}catch{return 'canonical URL is missing or invalid';}
 if(!actual.canonical||canonical!==expectedUrl)return `canonical ${JSON.stringify(actual.canonical)} (expected ${expectedUrl})`;
 return null;
}
export function articleSeoFailure(actual,title){
 if(!actual.title?.includes(title))return 'article page title is missing or stale';
 if(!actual.description?.trim())return 'article meta description is missing';
 if(actual.headings?.length!==1||actual.headings[0]!==title)return 'article must have exactly one H1 matching its title';
 if(/\b(noindex|none)\b/i.test(actual.robots||''))return 'article indexing is disabled';
 if(!actual.articleSchema)return 'matching BlogPosting structured data is missing';
 return null;
}
export async function verifyPublicPage(page,url,language,{attempts=3,delay=1500,articleTitle}={}){
 let problem='No document received';
 for(let attempt=1;attempt<=attempts;attempt++){
  let status=null;
  try{
   const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});status=response?.status()??null;
   // Host challenge pages may execute JavaScript before the real document loads.
   // No stealth, certificate bypass or CAPTCHA solving is used.
   await page.locator('head link[rel="canonical"]').waitFor({state:'attached',timeout:15000});
   const actual=await page.evaluate((title)=>{
    const nodes=[];
    for(const script of document.querySelectorAll('script[type="application/ld+json"]')){
     try{const value=JSON.parse(script.textContent);nodes.push(...(Array.isArray(value)?value:value['@graph']||[value]));}catch{/* Invalid schema fails the article check below. */}
    }
    return {language:document.documentElement.lang,canonical:document.querySelector('head link[rel="canonical"]')?.getAttribute('href')??null,
     title:document.title,description:document.querySelector('meta[name="description"]')?.content,
     headings:[...document.querySelectorAll('h1')].map(node=>node.textContent.trim()),
     robots:[...document.querySelectorAll('meta[name="robots"],meta[name="googlebot"]')].map(node=>node.content).join(','),
     articleSchema:nodes.some(node=>['BlogPosting','Article','NewsArticle'].includes(node['@type'])&&node.headline===title)};
   },articleTitle);
   problem=metadataFailure({...actual,status},url,language)||(articleTitle?articleSeoFailure(actual,articleTitle):null);
   if(!problem){console.log(`Verified ${language}: ${url}`);return;}
  }catch(error){problem=`navigation/metadata unavailable (${error.name||'Error'}; HTTP ${status??'unknown'})`;}
  console.warn(`Verification attempt ${attempt}/${attempts}: ${url}: ${problem}`);
  if(attempt<attempts)await new Promise(resolve=>setTimeout(resolve,delay*attempt));
 }
 throw new Error(`Live verification failed for ${url}: ${problem}`);
}
