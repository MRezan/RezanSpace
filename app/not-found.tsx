import Link from 'next/link';

export default function NotFound(){
 return <main className="custom-not-found">
  <section>
   <Link className="not-found-brand" href="/" aria-label="REZAN home"><img src="/favicon.svg" alt=""/><strong>REZAN</strong></Link>
   <div className="not-found-code" aria-hidden="true"><span>4</span><i>R</i><span>4</span></div>
   <small>PAGE NOT FOUND</small>
   <h1>This story took a different path.</h1>
   <p>The page may have moved, been unpublished, or never existed. There are still plenty of ideas worth discovering.</p>
   <nav aria-label="Not found actions"><Link className="not-found-primary" href="/">Return home</Link><Link href="/discover/">Explore stories</Link></nav>
  </section>
  <div className="not-found-orbit" aria-hidden="true"><i/><i/><i/></div>
 </main>;
}
