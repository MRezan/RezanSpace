import type {Metadata} from 'next';

export const metadata:Metadata={
  title:'Discover stories across every topic',
  description:'Explore original stories and perspectives across technology, business, science, health, culture, education, lifestyle, finance, travel and the environment.',
  alternates:{canonical:'/discover/'},
  openGraph:{
    title:'Discover stories across every topic | REZAN',
    description:'Explore useful ideas and original perspectives from independent writers across the REZAN community.',
    url:'/discover/',
    type:'website',
  },
};

export default function DiscoverLayout({children}:{children:React.ReactNode}){return children;}
