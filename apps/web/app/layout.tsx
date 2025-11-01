import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
// KaTeX styles for rendering math (remark-math + rehype-katex)
import "katex/dist/katex.min.css";
import I18nProvider from "../src/providers/I18nProvider";

// Sans (variable font)
const fontSans = localFont({
  src: "./fonts/GeistVF.woff",
  display: "swap",
  variable: "--font-sans",
  weight: "100 900",
});

// Mono (variable font); if you prefer Departure Mono, swap to its regular file
const fontMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  display: "swap",
  variable: "--font-mono",
  weight: "100 900",
});

// CJK (regular weight)
const fontCJK = localFont({
  src: "./fonts/XiaolaiSC-Regular.ttf",
  display: "swap",
  variable: "--font-cjk",
  weight: "400",
});

export const metadata: Metadata = {
  title: "youngro",
  description: "A smart assistant for developers",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${fontSans.variable} ${fontMono.variable} ${fontCJK.variable}`}
    >
      <body>
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
