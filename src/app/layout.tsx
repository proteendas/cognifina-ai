import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans, JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const plex = IBM_Plex_Sans({
  subsets: ["latin"],
  variable: "--font-secondary",
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Cognifina · Deterministic AI for forensic finance & compliance",
    template: "%s · Cognifina",
  },
  description:
    "Cognifina runs 25 forensic & compliance workflows — due diligence, statutory audit review, KYC/AML screening — on a deterministic multi-agent engine. Math before Models. Every finding source-cited to the exact page.",
  keywords: ["forensic accounting", "due diligence", "Benford's Law", "Beneish M-Score", "Altman Z-Score", "KYC AML", "audit AI"],
  icons: { icon: [{ url: "/icon.svg", type: "image/svg+xml" }] },
  openGraph: {
    type: "website",
    siteName: "Cognifina",
    title: "Cognifina · Deterministic AI for forensic finance & compliance",
    description:
      "Math before Models. Deterministic multi-agent forensics with exact page-level citations and reproducible runs.",
  },
};

export const viewport: Viewport = {
  themeColor: "#FAFAF9",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${jakarta.variable} ${plex.variable} ${mono.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
