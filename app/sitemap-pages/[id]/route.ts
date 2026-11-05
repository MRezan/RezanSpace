import entries from '../../sitemap-data';
import {sitemapDocuments} from '../../../lib/sitemap-xml.mjs';
export const dynamic='force-static';
export const dynamicParams=false;
export async function generateStaticParams(){return sitemapDocuments(await entries()).map((_,index)=>({id:`${index}.xml`}));}
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){const {id}=await params;const documents=sitemapDocuments(await entries());const index=/^\d+\.xml$/.test(id)?Number(id.slice(0,-4)):-1;return new Response(documents[index]||'Not found',{status:documents[index]?200:404,headers:{'Content-Type':'application/xml; charset=utf-8'}});}
