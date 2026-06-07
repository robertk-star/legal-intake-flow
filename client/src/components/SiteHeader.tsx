import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

export default function SiteHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-[#e5e7eb] shadow-sm">
      <div className="container flex items-center justify-between h-16">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#1a2332] rounded flex items-center justify-center">
            <span className="text-white font-bold text-sm">LLR</span>
          </div>
          <span className="font-bold text-[#1a2332] text-lg">Lead Leak Report</span>
        </Link>

        <nav className="hidden md:flex items-center gap-7">
          <a href="/#industries" className="text-[#374151] hover:text-[#1a2332] transition">Industries</a>
          <a href="/#what-we-check" className="text-[#374151] hover:text-[#1a2332] transition">What We Check</a>
          <a href="/#sample-report" className="text-[#374151] hover:text-[#1a2332] transition">Sample Report</a>
          <a href="/#faq" className="text-[#374151] hover:text-[#1a2332] transition">FAQ</a>
        </nav>

        <div className="hidden md:block">
          <a href="/#check">
            <Button className="bg-[#d97706] hover:bg-[#b45309] text-white font-semibold">Check My Website</Button>
          </a>
        </div>

        <button className="md:hidden text-[#1a2332]" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Open menu">
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {mobileMenuOpen && (
        <nav className="md:hidden border-t border-[#e5e7eb] bg-white">
          <div className="container py-4 flex flex-col gap-4">
            <a href="/#industries" className="text-[#374151] hover:text-[#1a2332]">Industries</a>
            <a href="/#what-we-check" className="text-[#374151] hover:text-[#1a2332]">What We Check</a>
            <a href="/#sample-report" className="text-[#374151] hover:text-[#1a2332]">Sample Report</a>
            <a href="/#faq" className="text-[#374151] hover:text-[#1a2332]">FAQ</a>
            <a href="/#check">
              <Button className="w-full bg-[#d97706] hover:bg-[#b45309] text-white font-semibold">Check My Website</Button>
            </a>
          </div>
        </nav>
      )}
    </header>
  );
}
