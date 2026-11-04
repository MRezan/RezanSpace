import {SocialFeed} from '../social-feed';
import type {Metadata} from 'next';
import {locales,languageNames,localePath} from '../../lib/i18n/locales';
export const metadata:Metadata={title:'REZAN — Choose your language',description:'Read REZAN in your language. Discover original stories, ideas and perspectives.',alternates:{canonical:'/'}};
export default function Home(){return <><section className="language-main"><header className="language-intro"><h1>Stories without borders.</h1><p>Choose your language to read and share original stories.</p></header><nav className="language-grid" aria-label="Languages">{locales.map(lang=><a className="language-empty" key={lang} href={localePath(lang)} hrefLang={lang} lang={lang}>{languageNames[lang]} →</a>)}</nav></section><SocialFeed/></>;}
