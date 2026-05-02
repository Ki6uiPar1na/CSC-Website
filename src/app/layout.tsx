import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "JKKNIU-CSC | Cyber Security Club",
  description: "The official platform for JKKNIU Cyber Security Club at Jatiya Kabi Kazi Nazrul Islam University",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased min-h-screen flex flex-col" suppressHydrationWarning>
        <Providers>
          <Navbar />
          <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
            {children}
          </main>
          <footer className="mt-auto py-8 text-center border-t border-border-color text-gray-500 text-xs sm:text-sm font-mono">
            <div className="max-w-7xl mx-auto px-4">
              <p>&copy; {new Date().getFullYear()} JKKNIU Cyber Security Club. All rights reserved.</p>
              <p className="mt-2 text-[10px] sm:text-xs">Jatiya Kabi Kazi Nazrul Islam University</p>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
