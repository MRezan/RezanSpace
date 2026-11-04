import '../../site-styles';
import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {metadata as siteMetadata} from '../../site-metadata';
import {direction,isLocale} from '../../../lib/i18n/locales';
import {UserShell} from '../../user-app-bar';
import {UiLanguage} from '../../ui-language';
export const dynamic='force-static';
export const dynamicParams=false;
export const metadata:Metadata=siteMetadata;
export default async function LanguageLayout({children,params}:{children:React.ReactNode;params:Promise<{lang:string}>}){
 const {lang}=await params;if(!isLocale(lang))notFound();
 return <html lang={lang} dir={direction(lang)}><body><UiLanguage locale={lang}><UserShell>{children}</UserShell></UiLanguage></body></html>;
}
