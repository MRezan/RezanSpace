import type { Metadata } from "next";
import "./globals.css";
import "./polish.css";
import "./sidebar-polish.css";
import "./brand-identity.css";
import "./consistent.css";
import "./account-polish.css";
import "./follow.css";
import "./pagination.css";
import "./appbar.css";
import "./unified-pages.css";
import "./icon-overrides.css";
import "./shared-appbar.css";
import "./profile-v2.css";
import "./library/library.css";
import "./composer-fix.css";
import "./discover/discover.css";
import "./app-nav-update.css";
import "./story-controls.css";
import "./engagement-icons.css";
import "./comments-v2.css";
import "./comments-hotfix.css";
import "./author/author.css";
import "./people-links.css";
import "./like-color.css";
import "./ux-stability.css";
import "./search/search-v2.css";
import "./mobile-appbar-fix.css";
import "./responsive-system.css";
import "./comment-mobile-fix.css";
import "./post/post-details.css";
import "./post/editorial-related.css";
import "./notification-alignment.css";
import "./professional-profile.css";
import "./reaction-state-fix.css";
import "./mobile-navigation-final.css";
import "./profile-avatar.css";
import "./timeline-description.css";
import "./rich-text-editor.css";
import "./rich-post-content.css";
import "./expandable-text.css";
import "./long-text-surfaces.css";
import "./profile-story-actions.css";
import "./rich-editor-interaction.css";
import "./post-ownership.css";
import "./save-animation.css";
import "./reaction-size-fix.css";
import "./rich-link-styles.css";
import "./rich-link-panel.css";
import "./rich-link-panel-v2.css";
import "./rich-link-production.css";
import "./rich-link-layer-fix.css";
import "./post/article-redesign.css";
import { UserShell } from "./user-app-bar";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://rezantech.web.app";
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl), title:{default:"REZAN — Ideas worth sharing",template:"%s | REZAN"},
  description:"Read and share original stories, ideas and perspectives across technology, business, science, health, culture, education, lifestyle, finance, travel and the environment.",
  keywords:["online publishing platform","independent writers","community stories","ideas and perspectives","technology","business","science","health","culture","education","lifestyle","finance","travel","environment"],
  authors:[{name:"REZAN Editorial"}], creator:"REZAN", publisher:"REZAN",
  openGraph:{type:"website",locale:"en_US",siteName:"REZAN",title:"REZAN — Ideas worth sharing",description:"A publishing community for original stories, useful ideas and perspectives across every topic."},
  twitter:{card:"summary_large_image",title:"REZAN — Ideas worth sharing",description:"A publishing community for original stories, useful ideas and perspectives across every topic."},
  icons:{icon:"/favicon.svg"}, robots:{index:true,follow:true}
};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en" data-scroll-behavior="smooth"><body suppressHydrationWarning><UserShell>{children}</UserShell></body></html>}
