'use client';
import {usePathname} from 'next/navigation';
import {dictionary,isLocale,languageNames,locales,localePath,type Locale} from '../lib/i18n/locales';
export function LanguageSwitcher({locale}:{locale?:Locale}){const pathname=usePathname();const segment=pathname.split('/')[1];const current=locale || (isLocale(segment)?segment:'en');return <label className="language-switcher"><span>{dictionary(current).languages}</span><select aria-label={dictionary(current).languages} value={current} onChange={event=>{if(isLocale(event.target.value))window.location.assign(localePath(event.target.value));}}>{locales.map(lang=><option key={lang} value={lang}>{languageNames[lang]}</option>)}</select></label>;}
