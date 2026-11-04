'use client';
import {Suspense} from 'react';
import {useSearchParams} from 'next/navigation';
import {isLocale,languageNames,locales,type Locale} from '../lib/i18n/locales';
function StoryLanguage({language='en'}:{language?:Locale}){return <label>Story language<select name="language" defaultValue={language}>{locales.map(lang=><option key={lang} value={lang}>{languageNames[lang]}</option>)}</select></label>;}
function RequestedLanguage(){const requested=useSearchParams().get('language');const language=requested&&isLocale(requested)?requested:'en';return <StoryLanguage key={language} language={language}/>;}
export function LanguageField(){return <Suspense fallback={<StoryLanguage/>}><RequestedLanguage/></Suspense>;}
