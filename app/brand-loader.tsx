/** One motion language for every wait state; labels remain screen-reader friendly. */
export function BrandLoader({label='Loading',compact=false}:{label?:string;compact?:boolean}){
 return <span className={`brand-loader${compact?' is-compact':''}`} role="status" aria-live="polite">
  <span className="brand-loader-scene" aria-hidden="true"><span className="brand-loader-orbit"><i/><i/><i/></span><span className="brand-loader-core"><img src="/favicon.svg" alt="" width="36" height="36"/></span></span>
  <span className="sr-only">{label}</span>
 </span>;
}
export function LoadingPanel({label}:{label?:string}){return <div className="shared-loading-panel"><BrandLoader label={label}/></div>;}
