import type { Metadata } from "next";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://rezan.space";
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl), title:{default:"REZAN — Ideas worth sharing",template:"%s | REZAN"},
  description:"Read and share original stories, ideas and perspectives across technology, business, science, health, culture, education, lifestyle, finance, travel and the environment.",
  keywords:["online publishing platform","independent writers","community stories","ideas and perspectives","technology","business","science","health","culture","education","lifestyle","finance","travel","environment"],
  authors:[{name:"REZAN Editorial"}], creator:"REZAN", publisher:"REZAN",
  openGraph:{type:"website",locale:"en_US",siteName:"REZAN",title:"REZAN — Ideas worth sharing",description:"A publishing community for original stories, useful ideas and perspectives across every topic."},
  twitter:{card:"summary_large_image",title:"REZAN — Ideas worth sharing",description:"A publishing community for original stories, useful ideas and perspectives across every topic."},
  icons:{icon:"/favicon.svg"}, robots:{index:true,follow:true}
};
