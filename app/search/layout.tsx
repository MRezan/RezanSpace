import type {Metadata} from 'next';

export const metadata:Metadata={
  title:'Search technology stories',
  description:'Search RezanTech stories, topics and technology writers.',
  robots:{index:false,follow:true},
};

export default function SearchLayout({children}:{children:React.ReactNode}){return children;}
