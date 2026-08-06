import type {Metadata} from 'next';

export const metadata:Metadata={
  title:'Search stories, topics and writers',
  description:'Search stories, ideas, topics and independent writers across the REZAN community.',
  robots:{index:false,follow:true},
};

export default function SearchLayout({children}:{children:React.ReactNode}){return children;}
