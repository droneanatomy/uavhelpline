import "./globals.css";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import { HeaderMetaProvider } from "../components/HeaderMeta";
import { Analytics } from "@vercel/analytics/next";
import { GoogleAnalytics } from "@next/third-parties/google";
import { SITE_URL } from "../lib/site";

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "UAVHelpline — Drone Intelligence",
    template: "%s",
  },
  description:
    "Independent, evidence-first intelligence on the global drone industry: technology, engineering, components, autonomy, and regulation.",
};

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <HeaderMetaProvider>
          <SiteHeader />
          <main>{children}</main>
          <SiteFooter />
        </HeaderMetaProvider>
        <Analytics />
        {GA_ID ? <GoogleAnalytics gaId={GA_ID} /> : null}
      </body>
    </html>
  );
}
