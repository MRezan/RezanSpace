import {type Locale,localePath} from './locales';
export type LocalizedPost = {id:number;slug:string;title:string;excerpt:string;content:string;author:string;category_name:string;image_url?:string;image_alt?:string;published_at:string;updated_at?:string;language:Locale;translation_key?:string|null};
export const postPath=(post:Pick<LocalizedPost,'language'|'slug'>)=>localePath(post.language,`post/${encodeURIComponent(post.slug)}`);
export function translationsFor(post:LocalizedPost, posts:LocalizedPost[]){return post.translation_key ? posts.filter(item=>item.translation_key===post.translation_key) : [post];}
export function jsonLd(value:unknown){return JSON.stringify(value).replace(/</g,'\\u003c');}
