import {BrandLoader} from './brand-loader';
/** Native Suspense and live-reader loading share the final article's geometry. */
export function StorySkeleton(){
 return <main className="reader-page reader-loading" role="status" aria-busy="true">
  <span className="sr-only">Loading story</span>
  <div className="reader-container" aria-hidden="true">
   <div className="reader-skeleton-breadcrumb skeleton-block"/>
   <div className="reader-layout">
    <div className="reader-article reader-skeleton-card">
     <div className="reader-header">
      <div className="reader-skeleton-topic skeleton-block"/>
      <div className="reader-skeleton-title skeleton-block"/><div className="reader-skeleton-title short skeleton-block"/>
      <div className="reader-skeleton-lead skeleton-block"/>
      <div className="reader-skeleton-byline"><span className="skeleton-block"/><div><i className="skeleton-block"/><i className="skeleton-block"/></div></div>
     </div>
     <div className="reader-skeleton-cover"><BrandLoader/></div>
     <div className="reader-content reader-skeleton-body">{[0,1].map(group=><div key={group}><i className="skeleton-block"/>{[0,1,2].map(line=><span className="skeleton-block" key={line}/>)}</div>)}</div>
    </div>
    <div className="reader-sidebar reader-skeleton-aside"><div className="reader-toc"><b className="skeleton-block"/>{[0,1,2,3].map(line=><span className="skeleton-block" key={line}/>)}</div><div className="reader-explore"><i className="skeleton-block"/><b className="skeleton-block"/><span className="skeleton-block"/></div></div>
   </div>
  </div>
 </main>;
}
