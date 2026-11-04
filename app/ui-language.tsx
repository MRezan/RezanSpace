'use client';
import {createContext,useContext,useEffect,useState,type ReactNode} from 'react';
import {usePathname} from 'next/navigation';
import {direction,isLocale,type Locale} from '../lib/i18n/locales';
import {uiText} from '../lib/i18n/ui';
const Context=createContext<Locale>('en');
export function UiLanguage({locale,children}:{locale?:Locale;children:ReactNode}){
 const [saved,setSaved]=useState<Locale>('en');const pathname=usePathname();const segment=pathname.split('/')[1];const current=locale||(isLocale(segment)?segment:saved);
 useEffect(()=>{if(locale||isLocale(segment)){localStorage.setItem('rezan_language',current);}else{const value=localStorage.getItem('rezan_language');if(value&&isLocale(value))setSaved(value);}},[locale,segment,current]);
 useEffect(()=>{document.documentElement.lang=current;document.documentElement.dir=direction(current);},[current]);
 return <Context.Provider value={current}>{children}</Context.Provider>;
}
export function useUi(){const locale=useContext(Context);return {locale,tr:(text:string)=>uiText(locale,text)};}
