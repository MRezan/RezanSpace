import LanguageLayout from '../../(localized)/[lang]/layout';
export {metadata} from '../../site-metadata';
export default function EnglishEditorialLayout({children}:{children:React.ReactNode}){return LanguageLayout({children,params:Promise.resolve({lang:'en'})});}
