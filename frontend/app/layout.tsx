import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Toaster } from "sonner";

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-sans",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "WebScraper Pro",
  description: "Intelligent content extraction platform with AI-powered search",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        <Providers>
          <div className="min-h-screen bg-gradient-to-br from-background via-background to-background">
            {/* Ambient background effects */}
            <div className="fixed inset-0 -z-10 overflow-hidden">
              <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-radial from-primary/10 via-transparent to-transparent opacity-50" />
              <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-radial from-purple-500/10 via-transparent to-transparent opacity-50" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-background/50 to-background" />
            </div>
            {children}
          </div>
          <Toaster 
            position="bottom-right" 
            toastOptions={{
              className: "glass-card",
            }}
          />
        </Providers>
      </body>
    </html>
  );
}

