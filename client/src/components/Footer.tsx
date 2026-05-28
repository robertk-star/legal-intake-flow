import { Link } from "wouter";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-[oklch(20%_0.05_255)] text-white">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 pb-10 border-b border-white/10">
          {/* Brand */}
          <div className="flex flex-col gap-4">
            <Link href="/" className="inline-flex">
              {/* White-background logo shown on dark footer with a subtle rounded container */}
              <div className="bg-white rounded-lg px-3 py-2 inline-flex items-center">
                <img
                  src="/images/lif-logo.png"
                  alt="Legal Intake Flow"
                  className="h-9 w-auto object-contain"
                  draggable={false}
                />
              </div>
            </Link>
            <p className="text-sm text-white/55 leading-relaxed max-w-xs">
              Helping connect disability benefits claimants with attorneys and advocates.
            </p>
          </div>

          {/* Navigation */}
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-1">
              Platform
            </p>
            <Link href="/how-it-works" className="text-sm text-white/65 hover:text-white transition-colors">
              How It Works
            </Link>
            <Link href="/for-attorneys" className="text-sm text-white/65 hover:text-white transition-colors">
              For Attorneys
            </Link>
            <Link href="/request-access" className="text-sm text-white/65 hover:text-white transition-colors">
              Request Access
            </Link>
          </div>

          {/* Legal */}
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-1">
              Legal
            </p>
            <Link href="/privacy" className="text-sm text-white/65 hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-sm text-white/65 hover:text-white transition-colors">
              Terms of Use
            </Link>
            <a href="mailto:contact@legalintakeflow.com" className="text-sm text-white/65 hover:text-white transition-colors">
              Contact
            </a>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-white/35">
            &copy; {year} Legal Intake Flow. All rights reserved.
          </p>
          <p className="text-xs text-white/35 text-center">
            Not a law firm. Not legal advice. For informational and referral purposes only.
          </p>
        </div>
      </div>
    </footer>
  );
}
