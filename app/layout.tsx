import type { Metadata } from "next";
import { Inter, Space_Mono } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { AppSessionProvider } from "@/components/providers/session-provider";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AppChrome } from "@/components/app-chrome";

const geistSans = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Space_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "TC Simple",
  description: "Authentication-ready foundation for TC Simple.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-slate-50 text-slate-900 antialiased`}
      >
        <AppSessionProvider session={session}>
          <SiteHeader />
          <main className="w-full px-0 pb-16 pt-32 md:pt-36">
            <AppChrome>{children}</AppChrome>
          </main>
        </AppSessionProvider>
      </body>
    </html>
  );
}
