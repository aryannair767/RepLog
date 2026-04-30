// src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";
import { ThemeProvider } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "RepLog",
  description: "High-performance workout logging platform",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "RepLog",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0B0B0B",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0, viewport-fit=cover" />
        <script dangerouslySetInnerHTML={{
          __html: `
    (function(){
      var m = document.querySelector('meta[name="viewport"]');
      if(m){
        var c = m.getAttribute('content');
        m.setAttribute('content', c + ',width=device-width');
        requestAnimationFrame(function(){ m.setAttribute('content', c); });
      }
    })();
  `}} />
      </head>
      <body suppressHydrationWarning>
        <AuthProvider>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
