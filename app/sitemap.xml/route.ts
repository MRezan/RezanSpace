import entries from '../sitemap-data';
import {sitemapDocuments,sitemapIndex} from '../../lib/sitemap-xml.mjs';
import {siteUrl} from '../../lib/i18n/locales';
export const dynamic='force-static';
export async function GET(){const documents=sitemapDocuments(await entries());return new Response(documents.length===1?documents[0]:sitemapIndex(siteUrl,documents.length),{headers:{'Content-Type':'application/xml; charset=utf-8'}});}
