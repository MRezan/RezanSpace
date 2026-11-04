import {SocialFeed} from '../social-feed';
import type {Metadata} from 'next';
import {getPublishedPosts} from '../../lib/i18n/posts';
export const metadata:Metadata={title:'REZAN — Stories, ideas and perspectives',description:'Read original stories about technology, business, science, culture and more.',alternates:{canonical:'/'}};
export default async function Home(){const posts=(await getPublishedPosts()).filter(post=>post.language==='en');return <SocialFeed locale="en" initialPosts={posts}/>;}
