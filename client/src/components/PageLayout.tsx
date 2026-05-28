import Navbar from "./Navbar";
import Footer from "./Footer";
import type { ReactNode } from "react";

interface PageLayoutProps {
  children: ReactNode;
  /** If true, adds padding-top to clear the fixed navbar. Default: true */
  withNavPadding?: boolean;
}

export default function PageLayout({ children, withNavPadding = true }: PageLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-[oklch(98%_0.005_255)]">
      <Navbar />
      <main className={`flex-1 ${withNavPadding ? "pt-16 md:pt-18" : ""}`}>
        {children}
      </main>
      <Footer />
    </div>
  );
}
