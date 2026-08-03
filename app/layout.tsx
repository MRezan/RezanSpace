import type { Metadata } from "next";
import "./globals.css";
import "./polish.css";
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
import { UserShell } from "./user-app-bar";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://rezantech.web.app";
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl), title:{default:"RezanTech — Ideas worth sharing",template:"%s | RezanTech"},
  description:"Independent stories and useful perspectives across technology, business, science, health, culture and everyday life.",
  keywords:["independent publishing","community stories","technology","business","science","health","culture","education"],
  authors:[{name:"RezanTech Editorial"}], creator:"RezanTech", publisher:"RezanTech",
  openGraph:{type:"website",locale:"en_US",siteName:"RezanTech",title:"RezanTech — Ideas worth sharing",description:"Independent stories and useful perspectives from a curious community."},
  twitter:{card:"summary_large_image",title:"RezanTech — Ideas worth sharing",description:"Independent stories and useful perspectives from a curious community."},
  icons:{icon:"/favicon.svg"}, robots:{index:true,follow:true}
};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en" data-scroll-behavior="smooth"><body suppressHydrationWarning><UserShell>{children}</UserShell></body></html>}
