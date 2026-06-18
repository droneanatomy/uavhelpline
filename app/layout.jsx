import "./globals.css";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";

export const metadata = {
  title: "UAVHelpline — Drone Intelligence",
  description:
    "Independent, evidence-first intelligence on the global drone industry: technology, engineering, components, autonomy, and regulation.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
