import Image from "next/image";
import Link from "next/link";

const FOOTER_LINKS = [
  { href: "/how-it-works", label: "How It Works" },
  { href: "/for-attorneys", label: "For Attorneys" },
  { href: "/request-access", label: "Request Access" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Use" },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-gray-200 bg-[#0d1b2e] text-gray-300">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start gap-8 md:flex-row md:items-start md:justify-between">
          {/* Logo + tagline */}
          <div className="flex flex-col gap-3">
            <Link href="/" aria-label="Legal Intake Flow — Home">
              <div className="rounded-lg bg-white px-3 py-2 inline-block">
                <Image
                  src="/images/lif-logo.png"
                  alt="Legal Intake Flow"
                  width={180}
                  height={50}
                  className="h-9 w-auto object-contain"
                  draggable={false}
                />
              </div>
            </Link>
            <p className="text-sm text-gray-400 max-w-xs">
              AI Intake Systems for Disability Attorneys
            </p>
            <p className="text-xs text-gray-500 max-w-xs">
              Smarter Intake. Better Cases. More Results.
            </p>
          </div>

          {/* Nav links */}
          <nav className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-8 sm:gap-y-2" aria-label="Footer navigation">
            {FOOTER_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="text-sm text-gray-400 transition-colors hover:text-white"
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-10 border-t border-gray-700 pt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-gray-500">
            &copy; {year} Legal Intake Flow. All rights reserved.
          </p>
          <p className="text-xs text-gray-600">
            Legal Intake Flow is not a law firm and does not provide legal advice.
            Partner referrals are subject to consent and intake review.
          </p>
        </div>
      </div>
    </footer>
  );
}
