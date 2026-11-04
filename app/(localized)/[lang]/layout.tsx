import '../../site-styles';
import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import Link from 'next/link';
import {metadata as siteMetadata} from '../../site-metadata';
import {dictionary,direction,isLocale,languageNames,locales,localePath} from '../../../lib/i18n/locales';
import {LanguageSwitcher} from '../../language-switcher';
export const dynamic='force-static';
export const dynamicParams=false;
export const metadata:Metadata=siteMetadata;
export default async function LanguageLayout({children,params}:{children:React.ReactNode;params:Promise<{lang:string}>}){
 const {lang}=await params;if(!isLocale(lang))notFound();const t=dictionary(lang);
 return <html lang={lang} dir={direction(lang)}><body className="localized-site"><header className="language-header"><Link className="language-brand" href={localePath(lang)}>REZAN</Link><nav aria-label={t.home}><Link href={localePath(lang)}>{t.home}</Link><Link href={`/create/?language=${lang}`}>{t.write}</Link></nav><LanguageSwitcher locale={lang}/></header>{children}<footer className="language-footer"><b>REZAN</b><nav aria-label={t.languages}>{locales.map(locale=><a key={locale} href={localePath(locale)} lang={locale} hrefLang={locale} aria-current={locale===lang?'page':undefined}>{languageNames[locale]}</a>)}</nav></footer></body></html>;
}
