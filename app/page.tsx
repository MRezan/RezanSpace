import type {Metadata} from 'next';import {SocialFeed} from './social-feed';import {FollowController} from './follow-controller';
export const metadata:Metadata={title:'RezanTech — Technology community',description:'A fresh social feed for technology stories, ideas and conversations.'};export default function Home(){return <><SocialFeed/><FollowController/></>}
