import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const browser=await chromium.launch({headless:true,channel:'chrome'});let checks=0;
for(const width of [390,1440]){
 const context=await browser.newContext({viewport:{width,height:950}});const page=await context.newPage();let calls=[];let optional=[];
 await context.route('https://rezan.space/api/**',async route=>{
  const url=new URL(route.request().url());if(url.pathname.endsWith('firebase-auth.php')){calls.push({action:url.searchParams.get('action'),body:route.request().postDataJSON()});return route.fulfill({json:{ok:true,message:'If an account uses this email, a password reset link will arrive shortly.'}});}
  return route.fulfill({json:{user:null,data:[],unread:0}});
 });
 page.on('request',request=>{if(/google-analytics|googletagmanager/.test(request.url()))optional.push(request.url());});
 await page.goto('http://localhost:3000/account/');await page.getByRole('button',{name:'Continue with Google'}).waitFor();
 await page.getByRole('button',{name:'Finish email recovery',exact:true}).click();await page.getByRole('heading',{name:'Finish your password reset.'}).waitFor();await page.getByRole('button',{name:'Back to sign in',exact:false}).click();await page.getByRole('button',{name:'Forgot password?',exact:true}).click();await page.getByLabel('Email address', {exact:true}).fill('reader@example.org');await page.getByRole('button',{name:'Send reset link'}).click();await page.getByRole('status').filter({hasText:'If an account'}).waitFor();assert.equal(calls.at(-1).action,'forgot');checks++;
 assert.equal(optional.length,0);checks++;
 await page.goto('http://localhost:3000/account/?mode=resetPassword&firebaseLink='+encodeURIComponent('https://rezan-space.firebaseapp.com/__/auth/action?mode=resetPassword&oobCode=test-code-only'));await page.getByLabel('New password',{exact:true}).fill('test-long-password');await page.getByLabel('Confirm new password',{exact:true}).fill('different-password');await page.getByRole('button',{name:'Update password'}).click();await page.getByRole('alert').filter({hasText:'do not match'}).waitFor();assert.equal(calls.length,1);checks++;
 await page.getByLabel('Confirm new password',{exact:true}).fill('test-long-password');await page.getByRole('button',{name:'Update password'}).click();await page.getByRole('heading',{name:'Sign in to continue.'}).waitFor();assert.equal(calls.at(-1).action,'reset');assert.equal(calls.at(-1).body.code,'test-code-only');assert.equal(new URL(page.url()).search,'');checks++;
 await page.getByRole('button',{name:'Privacy preferences',exact:true}).click();await page.getByRole('button',{name:'Essential only',exact:true}).click();assert.equal(await page.evaluate(()=>localStorage.getItem('rezan_measurement_consent')),'denied');checks++;
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);checks++;
 await fs.mkdir('build/ui-review',{recursive:true});await page.screenshot({path:`build/ui-review/auth-${width}.png`,fullPage:true});await context.close();
}
await browser.close();console.log(`${checks} account UI and consent checks passed.`);
