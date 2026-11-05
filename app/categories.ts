import {topicLabel,type Locale} from '../lib/i18n/locales';
export const categoryParents:Record<string,string>={
 'Tech How-to & Troubleshooting':'Technology',
 'Entertainment':'Culture',
 'Travel Planning':'Travel',
};
export const categories=['Technology','Tech How-to & Troubleshooting','Business','Science','Health','Culture','Entertainment','Education','Lifestyle','Finance','Travel','Travel Planning','Environment','Food & Recipes','DIY, Crafts & Hobbies','Sports'] as const;
export function categoryMatches(selected:string,actual:string){return selected===actual||categoryParents[actual]===selected;}
export function categoryOptionLabel(category:string,locale:Locale='en'){const parent=categoryParents[category];return parent?`${topicLabel(locale,parent)} › ${topicLabel(locale,category)}`:topicLabel(locale,category);}
export const suggestedInterests=[...categories,'Books','Design','Personal Growth'] as const;
export function categorySlug(category:string){return category.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');}
export function categoryPath(locale:Locale,category:string){return `/${locale}/category/${categorySlug(category)}/`;}
