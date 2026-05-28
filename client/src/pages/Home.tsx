import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import PageLayout from "@/components/PageLayout";
import {
  ArrowRight,
  CheckCircle2,
  Shield,
  Users,
  FileText,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Handshake,
  BadgeCheck,
} from "lucide-react";
import { useState } from "react";

// ── Section: Hero ─────────────────────────────────────────────────────────────
function HeroSection() {
  return (
    <section className="relative bg-[oklch(20%_0.05_255)] overflow-hidden min-h-[88vh] flex items-center">
      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(oklch(100%_0_0) 1px, transparent 1px), linear-gradient(90deg, oklch(100%_0_0) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      {/* Radial glow */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-[oklch(50%_0.16_255)] opacity-[0.07] blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-[oklch(42%_0.14_255)] opacity-[0.06] blur-[100px] pointer-events-none" />

      <div className="container relative z-10 py-24 md:py-32">
        <div className="max-w-3xl">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 mb-8 animate-fade-in">
            <div className="w-1.5 h-1.5 rounded-full bg-[oklch(66%_0.15_255)]" />
            <span className="text-xs font-medium text-white/75 tracking-wide">
              Attorney & Advocate Partner Platform
            </span>
          </div>

          <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-semibold text-white leading-[1.12] tracking-tight mb-6 animate-fade-up">
            High-Intent Disability Benefits Leads for{" "}
            <span className="text-[oklch(66%_0.15_255)]">Attorneys & Advocates</span>
          </h1>

          <p className="text-lg md:text-xl text-white/65 leading-relaxed mb-10 max-w-2xl animate-fade-up delay-100">
            Connect with individuals actively preparing for disability benefits who may be seeking
            legal or advocate support. Pre-screened, consent-based, and ready for follow-up.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 animate-fade-up delay-200">
            <Link href="/request-access">
              <Button
                size="lg"
                className="bg-white text-[oklch(20%_0.05_255)] hover:bg-white/90 rounded-xl px-8 h-12 text-base font-semibold shadow-lg transition-all"
              >
                Request Access
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <Link href="/how-it-works">
              <Button
                size="lg"
                variant="outline"
                className="border-white/25 text-white hover:bg-white/10 rounded-xl px-8 h-12 text-base font-medium transition-all"
              >
                How It Works
              </Button>
            </Link>
          </div>

          {/* Trust signals */}
          <div className="flex flex-wrap items-center gap-6 mt-12 animate-fade-up delay-300">
            {[
              "Documented claimant consent",
              "Pre-screened inquiries",
              "SSDI & SSI focus",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[oklch(66%_0.15_255)] flex-shrink-0" />
                <span className="text-sm text-white/60">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Section: How It Works (overview) ─────────────────────────────────────────
const HOW_STEPS = [
  {
    icon: ClipboardList,
    step: "01",
    title: "Claimant Completes Screening",
    body: "Individuals preparing to apply for SSDI or SSI benefits complete a structured intake questionnaire covering medical conditions, work history, prior applications, and current readiness.",
  },
  {
    icon: BadgeCheck,
    step: "02",
    title: "Consent & Review",
    body: "Claimants who opt in for legal support give explicit consent. Our team reviews each submission for completeness and quality.",
  },
  {
    icon: Handshake,
    step: "03",
    title: "Partner Receives Lead",
    body: "Qualified leads are routed to matched attorney and advocate partners with organized claimant information ready for follow-up.",
  },
];

function HowItWorksSection() {
  return (
    <section className="section-py bg-white">
      <div className="container">
        <div className="text-center mb-14">
          <p className="text-xs font-semibold uppercase tracking-widest text-[oklch(50%_0.16_255)] mb-3">
            The Process
          </p>
          <h2 className="font-serif text-3xl md:text-4xl font-semibold text-[oklch(20%_0.05_255)] mb-4">
            How Legal Intake Flow Works
          </h2>
          <p className="text-[oklch(46%_0.015_255)] max-w-xl mx-auto leading-relaxed">
            A structured, consent-based pipeline from claimant screening to attorney connection.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {HOW_STEPS.map((s, i) => (
            <div
              key={s.step}
              className="relative flex flex-col gap-5 p-8 rounded-2xl border border-[oklch(92%_0.01_255)] bg-[oklch(98%_0.005_255)] card-hover"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="flex items-start justify-between">
                <div className="w-11 h-11 rounded-xl bg-[oklch(97%_0.02_255)] border border-[oklch(93%_0.05_255)] flex items-center justify-center">
                  <s.icon className="w-5 h-5 text-[oklch(50%_0.16_255)]" />
                </div>
                <span className="font-serif text-4xl font-semibold text-[oklch(92%_0.01_255)]">
                  {s.step}
                </span>
              </div>
              <div>
                <h3 className="font-serif text-lg font-semibold text-[oklch(20%_0.05_255)] mb-2">
                  {s.title}
                </h3>
                <p className="text-sm text-[oklch(46%_0.015_255)] leading-relaxed">{s.body}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-10">
          <Link href="/how-it-works">
            <Button variant="outline" className="rounded-xl border-[oklch(86%_0.012_255)] text-[oklch(38%_0.015_255)] hover:bg-[oklch(96%_0.008_255)] h-10 px-6 text-sm font-medium">
              See Full Process
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

// ── Section: Value Proposition ────────────────────────────────────────────────
const VALUE_ITEMS = [
  {
    icon: Shield,
    title: "Consent-First Architecture",
    body: "Every lead includes documented claimant consent to be contacted by legal professionals. No cold outreach. No ambiguity.",
  },
  {
    icon: FileText,
    title: "Organized Claimant Information",
    body: "Leads arrive with structured intake data — medical conditions, work history, and readiness documentation — so your team can evaluate quickly.",
  },
  {
    icon: TrendingUp,
    title: "Scalable Intake Pipeline",
    body: "Whether you handle 5 or 500 cases per month, the platform scales with your capacity. Set your intake volume and we route accordingly.",
  },
  {
    icon: Users,
    title: "Qualified, High-Intent Inquiries",
    body: "Claimants have completed a structured screening process before reaching you — they are actively preparing and seeking support.",
  },
];

function ValueSection() {
  return (
    <section className="section-py bg-[oklch(97%_0.02_255)]">
      <div className="container">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[oklch(50%_0.16_255)] mb-3">
              Why It Matters
            </p>
            <h2 className="font-serif text-3xl md:text-4xl font-semibold text-[oklch(20%_0.05_255)] mb-5 leading-tight">
              Built for the realities of disability intake
            </h2>
            <p className="text-[oklch(46%_0.015_255)] leading-relaxed mb-8">
              Disability benefits cases require careful intake. Claimants are often vulnerable,
              documentation is complex, and timing matters. Legal Intake Flow is designed around
              these realities — not generic lead generation.
            </p>
            <Link href="/for-attorneys">
              <Button className="bg-[oklch(20%_0.05_255)] hover:bg-[oklch(26%_0.06_255)] text-white rounded-xl h-11 px-7 text-sm font-medium shadow-sm">
                Learn More for Attorneys
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {VALUE_ITEMS.map((item) => (
              <div
                key={item.title}
                className="p-6 rounded-2xl bg-white border border-[oklch(92%_0.01_255)] shadow-[var(--shadow-sm)] card-hover"
              >
                <div className="w-9 h-9 rounded-lg bg-[oklch(97%_0.02_255)] border border-[oklch(93%_0.05_255)] flex items-center justify-center mb-4">
                  <item.icon className="w-4 h-4 text-[oklch(50%_0.16_255)]" />
                </div>
                <h3 className="font-serif text-base font-semibold text-[oklch(20%_0.05_255)] mb-2">
                  {item.title}
                </h3>
                <p className="text-xs text-[oklch(46%_0.015_255)] leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Section: Attorney Benefits ────────────────────────────────────────────────
const BENEFITS = [
  "Pre-screened inquiries with documented consent",
  "Organized intake data including medical conditions and work history",
  "Readiness documentation prepared before the lead arrives",
  "Scalable volume — set your monthly intake capacity",
  "SSDI and SSI case focus with practice area matching",
  "Dedicated partner support and onboarding",
];

function AttorneyBenefitsSection() {
  return (
    <section className="section-py bg-[oklch(20%_0.05_255)] relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: "radial-gradient(oklch(100%_0_0) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />
      <div className="container relative z-10">
        <div className="max-w-2xl mx-auto text-center mb-14">
          <p className="text-xs font-semibold uppercase tracking-widest text-[oklch(66%_0.15_255)] mb-3">
            Partner Benefits
          </p>
          <h2 className="font-serif text-3xl md:text-4xl font-semibold text-white mb-4">
            What attorneys and advocates receive
          </h2>
          <p className="text-white/55 leading-relaxed">
            Every partner in the Legal Intake Flow network receives structured, consent-based
            leads with the documentation needed to evaluate and act quickly.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
          {BENEFITS.map((benefit, i) => (
            <div
              key={i}
              className="flex items-start gap-3 p-5 rounded-xl bg-white/[0.05] border border-white/10"
            >
              <CheckCircle2 className="w-4 h-4 text-[oklch(66%_0.15_255)] flex-shrink-0 mt-0.5" />
              <span className="text-sm text-white/75 leading-relaxed">{benefit}</span>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link href="/request-access">
            <Button
              size="lg"
              className="bg-white text-[oklch(20%_0.05_255)] hover:bg-white/90 rounded-xl px-8 h-12 text-base font-semibold shadow-lg"
            >
              Request Partner Access
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

// ── Section: Platform Principles ──────────────────────────────────────────────
// Replaces placeholder testimonials — no fictional quotes or unverified names.
const PRINCIPLES = [
  {
    heading: "Consent before contact",
    body: "No lead enters the partner network without explicit, timestamped claimant consent. Every partner receives only individuals who have affirmatively opted in to attorney contact.",
  },
  {
    heading: "Structured data, not raw inquiries",
    body: "Leads arrive with organized intake information — not raw form submissions. Your team receives what they need to evaluate a case before the first call.",
  },
  {
    heading: "Built for disability practice",
    body: "Legal Intake Flow is purpose-built for SSDI and SSI intake — not adapted from a generic lead generation tool. The process reflects the realities of disability representation.",
  },
];

function PlatformPrinciplesSection() {
  return (
    <section className="section-py bg-white">
      <div className="container">
        <div className="text-center mb-14">
          <p className="text-xs font-semibold uppercase tracking-widest text-[oklch(50%_0.16_255)] mb-3">
            Our Approach
          </p>
          <h2 className="font-serif text-3xl md:text-4xl font-semibold text-[oklch(20%_0.05_255)] mb-4">
            How we think about intake quality
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-7">
          {PRINCIPLES.map((p, i) => (
            <div
              key={i}
              className="flex flex-col gap-4 p-8 rounded-2xl border border-[oklch(92%_0.01_255)] bg-[oklch(98%_0.005_255)] card-hover"
            >
              <div className="w-8 h-8 rounded-full bg-[oklch(97%_0.02_255)] border border-[oklch(93%_0.05_255)] flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-[oklch(50%_0.16_255)]" />
              </div>
              <h3 className="font-serif text-lg font-semibold text-[oklch(20%_0.05_255)]">
                {p.heading}
              </h3>
              <p className="text-sm text-[oklch(46%_0.015_255)] leading-relaxed">{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Section: FAQ ──────────────────────────────────────────────────────────────
const FAQS = [
  {
    q: "Who is Legal Intake Flow for?",
    a: "Legal Intake Flow is designed for SSDI and SSI attorneys, disability advocates, intake teams, and law firms looking to expand their disability benefits practice with qualified, consent-based leads.",
  },
  {
    q: "How is claimant consent handled?",
    a: "Every claimant who reaches our partner network has explicitly consented to be contacted by legal professionals during their screening process. We document consent at the point of collection.",
  },
  {
    q: "What information comes with each lead?",
    a: "Leads include structured intake data: contact information, disability conditions, work history summary, and a readiness score based on the claimant's screening responses.",
  },
  {
    q: "What states and practice areas do you serve?",
    a: "We currently serve claimants across the United States with a focus on SSDI and SSI cases. Partner matching is based on your stated geographic coverage and practice area.",
  },
  {
    q: "How do I get started as a partner?",
    a: "Submit a Request Access form with your firm details. Our team will review your information and reach out to discuss fit, volume, and onboarding.",
  },
  {
    q: "Is there a cost to join the network?",
    a: "Pricing details are discussed during the partner onboarding process. We work with firms of different sizes and intake capacities to find an arrangement that makes sense.",
  },
];

function FAQSection() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="section-py bg-[oklch(97%_0.02_255)]">
      <div className="container">
        <div className="text-center mb-14">
          <p className="text-xs font-semibold uppercase tracking-widest text-[oklch(50%_0.16_255)] mb-3">
            Questions
          </p>
          <h2 className="font-serif text-3xl md:text-4xl font-semibold text-[oklch(20%_0.05_255)] mb-4">
            Frequently asked questions
          </h2>
        </div>

        <div className="max-w-2xl mx-auto flex flex-col gap-3">
          {FAQS.map((faq, i) => (
            <div
              key={i}
              className="rounded-xl border border-[oklch(92%_0.01_255)] bg-white overflow-hidden"
            >
              <button
                className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
                onClick={() => setOpen(open === i ? null : i)}
              >
                <span className="text-sm font-semibold text-[oklch(20%_0.05_255)]">{faq.q}</span>
                {open === i ? (
                  <ChevronUp className="w-4 h-4 text-[oklch(58%_0.015_255)] flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-[oklch(58%_0.015_255)] flex-shrink-0" />
                )}
              </button>
              {open === i && (
                <div className="px-6 pb-5">
                  <p className="text-sm text-[oklch(46%_0.015_255)] leading-relaxed">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Section: Closing CTA ──────────────────────────────────────────────────────
function ClosingCTASection() {
  return (
    <section className="section-py bg-white">
      <div className="container">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-[oklch(50%_0.16_255)] mb-4">
            Get Started
          </p>
          <h2 className="font-serif text-3xl md:text-4xl font-semibold text-[oklch(20%_0.05_255)] mb-5 leading-tight">
            Ready to grow your disability intake pipeline?
          </h2>
          <p className="text-[oklch(46%_0.015_255)] leading-relaxed mb-9">
            Join the Legal Intake Flow partner network and connect with individuals actively
            preparing for disability benefits who may need your expertise.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/request-access">
              <Button
                size="lg"
                className="bg-[oklch(20%_0.05_255)] hover:bg-[oklch(26%_0.06_255)] text-white rounded-xl px-8 h-12 text-base font-semibold shadow-md"
              >
                Request Access
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <Link href="/for-attorneys">
              <Button
                size="lg"
                variant="outline"
                className="border-[oklch(86%_0.012_255)] text-[oklch(38%_0.015_255)] hover:bg-[oklch(96%_0.008_255)] rounded-xl px-8 h-12 text-base font-medium"
              >
                Learn More
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Home() {
  return (
    <PageLayout withNavPadding={false}>
      <HeroSection />
      <HowItWorksSection />
      <ValueSection />
      <AttorneyBenefitsSection />
      <PlatformPrinciplesSection />
      <FAQSection />
      <ClosingCTASection />
    </PageLayout>
  );
}
