import {chromium} from 'playwright';
import fs from 'node:fs/promises';
await fs.mkdir('build/ui-review',{recursive:true});
const browser=await chromium.launch({headless:true,channel:"chrome"});
const posts=Array.from({length:8},(_,i)=>({id:i+1,slug:'story-'+i,post_slug:'story-'+i,language:'en',title:['The ideas shaping a more thoughtful future','Small changes, lasting impact','A fresh perspective on everyday technology'][i%3],excerpt:'Thoughtful perspectives, practical discoveries and stories from people who see the world a little differently.',content:'<p>Every good idea starts with a little curiosity. Explore practical discoveries and independent perspectives from the community.</p>',author:['Maya Chen','Nadia Rahman','Jon Bell'][i%3],category_name:['Technology','Science','Culture'][i%3],created_at:'2026-11-05T08:00:00Z',published_at:'2026-11-05T08:00:00Z',saved_at:'2026-11-05T08:00:00Z',like_count:12+i,comment_count:3}));
const report=[];
for (const width of (process.env.UI_REVIEW_WIDTHS?.split(',').map(Number)||[1440,1024,768,390,320])) {
 const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});
 await context.addInitScript(()=>{localStorage.setItem('rezantech_session','local-ui-review');localStorage.setItem('rezantech_user',JSON.stringify({name:'Alex Morgan',role:'admin'}))});
 await context.route('https://rezan.space/api/**',route=>{
  const url=new URL(route.request().url());const user={name:'Alex Morgan',email:'alex@example.com',role:'admin',bio:'Writer, reader and curious mind.',created_at:'2026-01-01',interests:'Technology, Design',profession:'Designer',follower_count:24,following_count:8};let data={data:posts,pagination:{total:8,pages:1,has_more:false}};
  if(url.pathname.endsWith('posts.php')&&Number(url.searchParams.get('page')||1)>1)data={data:[],pagination:{total:8,pages:1,has_more:false}};
  if(url.pathname.endsWith('admin-users.php'))data={data:[{...user,id:1,post_count:8,is_owner:true}],pagination:{total:1,pages:1}};
  if(url.pathname.endsWith('admin-subscribers.php'))data={data:[],pagination:{total:0,pages:1}};
  if(url.pathname.endsWith('comments.php'))data={data:[],comments:[]};
  if(url.pathname.endsWith('posts.php')&&url.searchParams.has('slug'))data=posts[0];
  if(url.pathname.endsWith('auth.php')) data={user:{name:'Alex Morgan',email:'alex@example.com',role:'admin',bio:'Writer, reader and curious mind.',created_at:'2026-01-01',interests:'Technology, Design',profession:'Designer'}};
  if(url.pathname.endsWith('profile.php'))data={user,posts:posts.map(post=>({...post,status:'published'}))};
  if(url.pathname.endsWith('people.php'))data=url.searchParams.has('name')?{person:{...user,name:'Maya Chen',post_count:8},posts,following:false}:{data:[{...user,id:1,name:'Maya Chen',post_count:8}]};
  if(url.pathname.endsWith('library.php')) data={saved:posts,notifications:[],pagination:{total:8,pages:1}};
  if(url.pathname.endsWith('follows.php')) data={data:[]};
  if(url.pathname.endsWith('categories.php')) data={data:[{id:1,name:'Technology',slug:'technology',post_count:8}]};
  if(url.pathname.endsWith('dashboard.php')) data={admin:{name:'Alex Morgan',email:'alex@example.com',role:'owner'},permissions:{stories:true,publish:true,users:true,categories:true,subscribers:true},stats:{posts:8,published:8,drafts:0,subscribers:12,categories:1,users:3},categories:[{name:'Technology',total:8}]};
  return route.fulfill({json:data});
 });
 const page=await context.newPage();const errors=[];page.on('pageerror',err=>errors.push(err.stack));
 for(const path of (process.env.UI_REVIEW_ROUTES?.split(',')||['/','/discover/','/library/','/account/','/search/?q=ideas','/author/?name=Maya','/profile/','/create/','/admin/','/bn/','/ar/','/en/post/solar-energy-en/','/bn/post/solar-energy-bn/','/en/category/science/','/bn/category/science/','/ar/category/science/'])) {
  errors.length=0;const response=await page.goto('http://127.0.0.1:3000'+path);if(!response.ok())throw Error(`${path}: HTTP ${response.status()}`);await page.waitForTimeout(700);
  const layout=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,overflow:[...document.querySelectorAll('main *')].filter(el=>{const r=el.getBoundingClientRect();return r.width>0&&(r.right>innerWidth+2||r.left< -2)&&getComputedStyle(el).position!=='absolute'&&getComputedStyle(el).position!=='fixed'}).slice(0,5).map(el=>el.className)}));
  report.push({width,path,...layout,errors:[...errors]});
  if([1440,390].includes(width)) await page.screenshot({path:`build/ui-review/${width}-${path.split('?')[0].replaceAll('/','-')||'home'}.png`,fullPage:true});
  if(path==='/'&&width===390)await page.screenshot({path:'build/ui-review/home-mobile.png'});
  if(path==='/'&&width===1440)await page.screenshot({path:'build/ui-review/home-desktop.png'});
  if(width<=700&&path!=='/admin/'){
   const position=await page.locator('.user-appbar>nav').evaluate(el=>({bottom:el.getBoundingClientRect().bottom,viewport:innerHeight}));
   if(Math.abs(position.bottom-position.viewport)>1)throw Error('Mobile navigation is not at the bottom of the viewport');
  }
  if(/^\/(?:en|es|pt-BR|hi|id|ar|fr|de|ja|bn|vi|tr|ko|it|pl)?\/?$/.test(path)){
   if(await page.locator('.social-left details').count())throw Error('Sidebar must not contain nested subcategories');
   if(await page.locator('.social-left .side-topic').count()!==8)throw Error('Sidebar should start with eight flat topics');
   if(width>720){
    await page.locator('.sidebar-more').click();
    if(await page.locator('.social-left .side-topic').count()!==16)throw Error('See more must expose all 16 flat topics');
    if(path==='/'||path==='/en/')if(!await page.getByRole('button',{name:'Tech Guides',exact:true}).isVisible())throw Error('Compact topic label is missing');
    const sidebar=await page.locator('.social-left').evaluate(el=>{const list=el.querySelector('.side-topic-list');const more=el.querySelector('.sidebar-more');const rows=[...el.querySelectorAll('.side-topic')].map(row=>row.getBoundingClientRect().left);return {scrollable:list.scrollHeight>list.clientHeight,flat:rows.every(x=>Math.abs(x-rows[0])<1),bottom:more.getBoundingClientRect().bottom<=el.getBoundingClientRect().bottom+1};});
    if(!sidebar.scrollable||!sidebar.flat||!sidebar.bottom)throw Error('Sidebar must scroll as one flat list with See more at its bottom');
    await page.locator('.social-left .side-topic').last().click();
    if(await page.locator('.social-left .side-topic').last().getAttribute('aria-pressed')!=='true')throw Error('Topic selection failed');
    await page.locator('.feed-tabs button').first().click();
    await page.locator('.sidebar-more').click();
   }
   await page.locator('.user-appbar .account-trigger').click();
   await page.keyboard.press('Escape');
   if(await page.locator('.account-menu').count())throw Error('Escape did not close account menu');
   await page.locator('.user-appbar .notice').click();
   await page.keyboard.press('Escape');
   if(await page.locator('.notifications-menu').count())throw Error('Escape did not close notifications');
  }
  if(path==='/account/'){
   await page.getByRole('button',{name:'Register',exact:true}).click();
   await page.getByRole('textbox',{name:'Full name',exact:true}).waitFor();
  }
  if(path==='/profile/'){
   await page.getByRole('button',{name:'Edit profile',exact:false}).first().click();
   await page.locator('.profile-form').waitFor();
  }
  if(path==='/admin/'){
   for(const tab of ['All stories','New article','Categories','Subscribers','Users & access']){
    const control=page.locator('.cms-side nav button').filter({hasText:tab}).first();
    if(await control.count()){
     if(width<=760)await page.getByRole('button',{name:'Open navigation',exact:true}).click();
     await control.click();await page.waitForTimeout(250);
     if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)){
      await page.screenshot({path:`build/ui-review/overflow-admin-${width}.png`,fullPage:true});
      throw Error(`Admin ${tab} overflows at ${width}px`);
     }
    }
   }
  }
 }
 await context.close();
 console.log(`${width}px complete.`);
}
await fs.writeFile('build/ui-review/report.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report.filter(row=>row.scroll>row.width||row.errors.length),null,2));
console.log(`${report.length} responsive page checks complete.`);
if(report.some(row=>row.scroll>row.width||row.errors.length))process.exitCode=1;
await browser.close();
