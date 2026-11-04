import "../site-styles";
import { UserShell } from "../user-app-bar";

export { metadata } from "../site-metadata";
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en" data-scroll-behavior="smooth"><body suppressHydrationWarning><UserShell>{children}</UserShell></body></html>}
