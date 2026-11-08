'use client';
import {useEffect,useState} from 'react';
import {usePathname} from 'next/navigation';
import Link from 'next/link';
import {firebaseConfig} from '../lib/firebase-config';
const preference='rezan_measurement_consent';
const privatePage=(path:string)=>/^\/(account|admin|profile|create)(\/|$)/.test(path);
type AnalyticsModule=typeof import('firebase/analytics');
let measurement:Promise<{sdk:AnalyticsModule;analytics:import('firebase/analytics').Analytics}|null>|undefined;
async function analytics(){
 return measurement??=Promise.all([import('firebase/app'),import('firebase/analytics')]).then(async([app,sdk])=>{
  if(!await sdk.isSupported())return null;
  const instance=app.getApps().length?app.getApp():app.initializeApp(firebaseConfig);
  // Manual page views never contain reset codes, search queries or private routes.
  const tracker=sdk.initializeAnalytics(instance,{config:{send_page_view:false,allow_google_signals:false,allow_ad_personalization_signals:false,page_location:location.origin+location.pathname,page_referrer:''}});
  sdk.setConsent({analytics_storage:'granted',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
  return {sdk,analytics:tracker};
 }).catch(()=>null);
}
export function FirebaseMonitoring(){
 const path=usePathname();const [consent,setConsent]=useState<string|null>('loading');const [settings,setSettings]=useState(false);
 useEffect(()=>{function sync(){try{setConsent(localStorage.getItem(preference));}catch{setConsent('denied');}}sync();window.addEventListener('storage',sync);return()=>window.removeEventListener('storage',sync);},[]);
 useEffect(()=>{
  if(consent!=='granted'||privatePage(path)){if(measurement)void measurement.then(value=>{if(value)value.sdk.setAnalyticsCollectionEnabled(value.analytics,false);});return;}
  let active=true;
  void analytics().then(value=>{if(value&&active&&localStorage.getItem(preference)==='granted'){value.sdk.setConsent({analytics_storage:'granted',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});value.sdk.setAnalyticsCollectionEnabled(value.analytics,true);value.sdk.logEvent(value.analytics,'page_view',{page_location:location.origin+path,page_path:path,page_title:document.title,page_referrer:''});}});
  return()=>{active=false;};
 },[path,consent]);
 useEffect(()=>{
  // Web Crashlytics is preview. Explicitly opt in only on a preview environment.
  if(process.env.NEXT_PUBLIC_CRASHLYTICS_WEB_PREVIEW!=='true'||consent!=='granted'||privatePage(path))return;
  let active=true;let remove=()=>{};
  void Promise.all([import('firebase/app'),import('firebase/crashlytics')]).then(([app,sdk])=>{
   if(!active)return;
   const instance=app.getApps().length?app.getApp():app.initializeApp(firebaseConfig);
   const crash=sdk.getCrashlytics(instance,{captureUnhandledErrors:false,registerGlobalLoggerProvider:false,appVersion:process.env.NEXT_PUBLIC_RELEASE||'preview'});
   let count=0;
   // Fixed classification only: no raw messages, request data, URLs or user IDs.
   const report=()=>{if(active&&count++<5)sdk.recordError(crash,new Error('Unhandled website error'),{route_type:'public'});};
   window.addEventListener('error',report);window.addEventListener('unhandledrejection',report);
   remove=()=>{window.removeEventListener('error',report);window.removeEventListener('unhandledrejection',report);};
  }).catch(()=>{});
  return()=>{active=false;remove();};
 },[consent,path]);
 function choose(value:string){try{localStorage.setItem(preference,value);}catch{}setConsent(value);setSettings(false);if(value==='denied'&&measurement){void measurement.then(result=>{if(result){result.sdk.setConsent({analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});result.sdk.setAnalyticsCollectionEnabled(result.analytics,false);}});}}
 return <>{((consent===null&&!privatePage(path))||settings)&&<aside className="measurement-choice" aria-label="Privacy preferences"><div><strong>Help improve REZAN</strong><p>Allow optional Google Analytics to understand how public pages are used. Account forms and recovery links are excluded. <Link href="/privacy/">Privacy details</Link></p></div><div><button onClick={()=>choose('denied')}>Essential only</button><button onClick={()=>choose('granted')}>Allow analytics</button></div></aside>}<button className="measurement-settings" onClick={()=>setSettings(value=>!value)} aria-label="Privacy preferences">Privacy</button></>;
}
