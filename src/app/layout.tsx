import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { MainNav } from "@/components/main-nav";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Fast Order - Granero los Paisas",
  description: "Sistema ágil de gestión de pedidos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <body className={cn(inter.className, "min-h-screen bg-background font-sans antialiased")}>
        <div className="flex-col md:flex">
          <div className="border-b">
            <div className="flex h-16 items-center px-4">
              <h1 className="text-xl font-bold mr-8 tracking-tight">Fast Order</h1>
              <MainNav />
              <div className="ml-auto flex items-center space-x-4">
                {/* UserNav or similar goes here */}
              </div>
            </div>
          </div>
          <main className="flex-1 space-y-4 p-8 pt-6">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
