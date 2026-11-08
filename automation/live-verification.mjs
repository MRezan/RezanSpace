/** Verify the rendered document after the host's ordinary browser challenge. */
export function metadataFailure(actual,expectedUrl,expectedLanguage){
 if(actual.status!==null&&(actual.status<200||actual.status>=300))return `HTTP ${actual.status}`;
 if((actual.language||'').toLowerCase()!==expectedLanguage.toLowerCase())return `language ${JSON.stringify(actual.language)} (expected ${expectedLanguage})`;
 let canonical;try{canonical=new URL(actual.canonical,expectedUrl).href;}catch{return 'canonical URL is missing or invalid';}
 if(!actual.canonical||canonical!==expectedUrl)return `canonical ${JSON.stringify(actual.canonical)} (expected ${expectedUrl})`;
 return null;
}
export async function verifyPublicPage(page,url,language,{attempts=3,delay=1500}={}){
 let problem='No document received';
 for(let attempt=1;attempt<=attempts;attempt++){
  let status=null;
  try{
   const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});status=response?.status()??null;
   // Host challenge pages may execute JavaScript before the real document loads.
   // No stealth, certificate bypass or CAPTCHA solving is used.
   await page.locator('head link[rel="canonical"]').waitFor({state:'attached',timeout:15000});
   const actual=await page.evaluate(()=>({language:document.documentElement.lang,canonical:document.querySelector('head link[rel="canonical"]')?.getAttribute('href')??null}));
   problem=metadataFailure({...actual,status},url,language);
   if(!problem){console.log(`Verified ${language}: ${url}`);return;}
  }catch(error){problem=`navigation/metadata unavailable (${error.name||'Error'}; HTTP ${status??'unknown'})`;}
  console.warn(`Verification attempt ${attempt}/${attempts}: ${url}: ${problem}`);
  if(attempt<attempts)await new Promise(resolve=>setTimeout(resolve,delay*attempt));
 }
 throw new Error(`Live verification failed for ${url}: ${problem}`);
}
