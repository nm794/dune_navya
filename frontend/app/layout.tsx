import type { Metadata } from "next";
import type { ReactNode } from "react";
import ThemeToggle from "../components/ThemeToggle";
import "./globals.css";

export const metadata: Metadata = {
  title: "Custom Form Builder",
  description: "Build forms, collect responses, view analytics",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100 transition-colors">
        <header className="w-full border-b bg-white/70 dark:bg-gray-800/70 backdrop-blur sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <h1 className="font-semibold">Custom Form Builder</h1>
            <ThemeToggle />
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
