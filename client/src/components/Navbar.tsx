import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Menu, X, Scale } from "lucide-react";

const NAV_LINKS = [
  { label: "How It Works", href: "/how-it-works" },
  { label: "For Attorneys", href: "/for-attorneys" },
];

export default function Navbar() {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false); }, [location]);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/95 backdrop-blur-md shadow-[0_1px_0_0_oklch(92%_0.01_255)]"
          : "bg-transparent"
      }`}
    >
      <div className="container">
        <div className="flex items-center justify-between h-16 md:h-18">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-[oklch(20%_0.05_255)] flex items-center justify-center flex-shrink-0 group-hover:bg-[oklch(26%_0.06_255)] transition-colors">
              <Scale className="w-4 h-4 text-white" />
            </div>
            <span className="font-serif font-semibold text-[oklch(20%_0.05_255)] text-lg leading-none tracking-tight">
              Legal Intake Flow
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors ${
                  location === link.href
                    ? "text-[oklch(20%_0.05_255)]"
                    : "text-[oklch(46%_0.015_255)] hover:text-[oklch(20%_0.05_255)]"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link href="/request-access">
              <Button
                size="sm"
                className="bg-[oklch(20%_0.05_255)] hover:bg-[oklch(26%_0.06_255)] text-white rounded-lg px-5 h-9 text-sm font-medium shadow-sm transition-all"
              >
                Request Access
              </Button>
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-md text-[oklch(46%_0.015_255)] hover:text-[oklch(20%_0.05_255)] hover:bg-[oklch(96%_0.008_255)] transition-colors"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-[oklch(92%_0.01_255)] shadow-lg">
          <div className="container py-4 flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  location === link.href
                    ? "bg-[oklch(96%_0.008_255)] text-[oklch(20%_0.05_255)]"
                    : "text-[oklch(46%_0.015_255)] hover:bg-[oklch(96%_0.008_255)] hover:text-[oklch(20%_0.05_255)]"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-2 border-t border-[oklch(92%_0.01_255)] mt-1">
              <Link href="/request-access">
                <Button className="w-full bg-[oklch(20%_0.05_255)] hover:bg-[oklch(26%_0.06_255)] text-white rounded-lg h-10 text-sm font-medium">
                  Request Access
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
