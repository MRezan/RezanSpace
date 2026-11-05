const header='<?xml version="1.0" encoding="UTF-8"?>\n';
const open='<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n';
const escape=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&apos;');
/** @param {import('next').MetadataRoute.Sitemap} entries */
export function sitemapDocuments(entries,maxUrls=10000,maxBytes=8000000){
 const documents=[];let rows=[],bytes=Buffer.byteLength(header+open+'</urlset>');
 for(const entry of entries){
  let row='<url><loc>'+escape(entry.url)+'</loc>';
  if(entry.lastModified)row+='<lastmod>'+escape(new Date(entry.lastModified).toISOString())+'</lastmod>';
  for(const [language,url] of Object.entries(entry.alternates?.languages||{}))row+='<xhtml:link rel="alternate" hreflang="'+escape(language)+'" href="'+escape(url)+'"/>';
  row+='</url>\n';const size=Buffer.byteLength(row);
  if(size+Buffer.byteLength(header+open+'</urlset>')>maxBytes)throw Error('A sitemap entry exceeds the document size limit');
  if(rows.length&&(rows.length>=maxUrls||bytes+size>maxBytes)){documents.push(header+open+rows.join('')+'</urlset>');rows=[];bytes=Buffer.byteLength(header+open+'</urlset>');}
  rows.push(row);bytes+=size;
 }
 documents.push(header+open+rows.join('')+'</urlset>');return documents;
}
export function sitemapIndex(origin,count){return header+'<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+Array.from({length:count},(_,i)=>'<sitemap><loc>'+escape(`${origin}/sitemap-pages/${i}.xml`)+'</loc></sitemap>').join('')+'</sitemapindex>';}
