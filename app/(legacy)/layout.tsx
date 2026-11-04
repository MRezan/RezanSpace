import "../site-styles";
import { UserShell } from "../user-app-bar";

import {UiLanguage} from "../ui-language";

export { metadata } from "../site-metadata";
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en" data-scroll-behavior="smooth"><body suppressHydrationWarning><UiLanguage><UserShell>{children}</UserShell></UiLanguage></body></html>}
