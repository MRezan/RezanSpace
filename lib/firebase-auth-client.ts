import {getApp,getApps,initializeApp} from 'firebase/app';
import {GoogleAuthProvider,initializeAuth,inMemoryPersistence,browserPopupRedirectResolver,signInWithPopup,signInWithEmailAndPassword} from 'firebase/auth';
import {firebaseConfig} from './firebase-config';
let auth:ReturnType<typeof initializeAuth>|undefined;
export function googleSignIn(){
 const app=getApps().length?getApp():initializeApp(firebaseConfig);
 auth??=initializeAuth(app,{persistence:inMemoryPersistence,popupRedirectResolver:browserPopupRedirectResolver});
 const provider=new GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});
 return signInWithPopup(auth,provider);
}
export function googleAuthMessage(error:unknown){
 const code=(error as {code?:string})?.code;
 if(code==='auth/popup-closed-by-user'||code==='auth/cancelled-popup-request')return '';
 if(code==='auth/popup-blocked')return 'Allow the Google sign-in popup, then try again.';
 if(code==='auth/unauthorized-domain')return 'Google sign-in is not configured for this website yet.';
 if(code==='auth/network-request-failed')return 'Could not reach Google. Check your connection and try again.';
 return 'Google sign-in is temporarily unavailable. Please try again.';
}

export function recoverySignIn(email:string,password:string){
 const app=getApps().length?getApp():initializeApp(firebaseConfig);
 auth??=initializeAuth(app,{persistence:inMemoryPersistence,popupRedirectResolver:browserPopupRedirectResolver});
 return signInWithEmailAndPassword(auth,email,password);
}
