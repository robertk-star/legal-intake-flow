import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import PageLayout from "@/components/PageLayout";
import {
  ArrowRight,
  CheckCircle2,
  Shield,
  FileText,
  TrendingUp,
  Users,
  Clock,
  BarChart3,
  Zap,
  Globe,
} from "lucide-react";

const BENEFITS = [
  {
    icon: Shield,
    title: "Consent-First Leads",
    body: "Every claimant has explicitly consented to attorney contact before their information is shared. No cold outreach. No compliance ambiguity.",
  },
  {
    icon: FileText,
    title: "Structured Intake Data",
    body: "Leads arrive with organized claimant information — medical conditions, work history, documentation status — so your intake team can evaluate in minutes, not hours.",
  },
  {
    icon: TrendingUp,
    title: "High-Intent Claimants",
    body: "Claimants have completed a structured screening process. They are actively preparing for their disability claim and seeking professional guidance.",
  },
  {
    icon: Clock,
    title: "Recommended Contact Windows",
    body: "Each lead includes a recommended follow-up window based on the claimant's screening responses and current readiness stage.",
  },
  {
    icon: BarChart3,
    title: "Readiness Scoring",
    body: "A readiness score accompanies every lead, helping your team prioritize cases and allocate intake resources where they have the greatest impact.",
  },
  {
    icon: Users,
    title: "Scalable Volume",
    body: "Set your monthly intake capacity during onboarding. Leads are routed to match your stated volume — scale up or down as your practice evolves.",
  },
];

const QUALIFICATIONS = [
  "Licensed to practice law in at least one U.S. state, or a certified non-attorney advocate",
  "Active disability benefits practice with SSDI and/or SSI case experience",
  "Dedicated intake process capable of responding to leads within the recommended window",
  "Commitment to claimant-centered communication and ethical intake practices",
  "Willingness to provide feedback on lead quality to support continuous improvement",
];

const INTEGRATION_STEPS = [
  {
    step: "01",
    title: "Submit Request",
    body: "Complete the Request Access form with your firm details, practice area, and geographic coverage.",
  },
  {
    step: "02",
    title: "Partner Review",
    body: "Our team reviews your application and reaches out to discuss fit, volume preferences, and onboarding details.",
  },
  {
    step: "03",
    title: "Onboarding",
    body: "Set your intake preferences, geographic coverage, and monthly volume. We configure your routing profile.",
  },
  {
    step: "04",
    title: "Receive Leads",
    body: "Start receiving structured, consent-based disability leads matched to your practice profile.",
  },
];

const PRACTICE_AREAS = [
  "Social Security Disability Insurance (SSDI)",
  "Supplemental Security Income (SSI)",
  "Disability appeals and hearings",
  "Initial disability applications",
  "Long-term disability (LTD) coordination",
  "Veterans disability benefits",
];

export default function ForAttorneys() {
  return (
    <PageLayout>
      {/* Page header */}
      <section className="bg-[oklch(20%_0.05_255)] py-20">
        <div className="container">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-[oklch(66%_0.15_255)] mb-4">
              For Attorneys & Advocates
            </p>
            <h1 className="font-serif text-4xl md:text-5xl font-semibold text-white mb-5 leading-tight">
              Grow your disability practice with structured, consent-based leads
            </h1>
            <p className="text-white/60 text-lg leading-relaxed mb-8">
              Legal Intake Flow connects disability attorneys and advocates with pre-screened
              claimants who have explicitly consented to legal contact and arrived with organized
              intake documentation.
            </p>
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

      {/* Benefits grid */}
      <section className="section-py bg-white">
        <div className="container">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold uppercase tracking-widest text-[oklch(50%_0.16_255)] mb-3">
              Partner Benefits
            </p>
            <h2 className="font-serif text-3xl md:text-4xl font-semibold text-[oklch(20%_0.05_255)] mb-4">
              What you receive as a partner
            </h2>
            <p className="text-[oklch(46%_0.015_255)] max-w-xl mx-auto leading-relaxed">
              Every lead in the Legal Intake Flow network is structured, consented, and ready for
              your intake team to act on.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {BENEFITS.map((b) => (
              <div
                key={b.title}
                className="p-7 rounded-2xl border border-[oklch(92%_0.01_255)] bg-[oklch(98%_0.005_255)] card-hover"
              >
                <div className="w-10 h-10 rounded-xl bg-[oklch(97%_0.02_255)] border border-[oklch(93%_0.05_255)] flex items-center justify-center mb-5">
                  <b.icon className="w-5 h-5 text-[oklch(50%_0.16_255)]" />
                </div>
                <h3 className="font-serif text-base font-semibold text-[oklch(20%_0.05_255)] mb-2">
                  {b.title}
                </h3>
                <p className="text-sm text-[oklch(46%_0.015_255)] leading-relaxed">{b.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Practice areas */}
      <section className="section-py bg-[oklch(97%_0.02_255)]">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[oklch(50%_0.16_255)] mb-3">
                Practice Areas
              </p>
              <h2 className="font-serif text-3xl font-semibold text-[oklch(20%_0.05_255)] mb-5">
                Disability practice areas we serve
              </h2>
              <p className="text-[oklch(46%_0.015_255)] leading-relaxed mb-7">
                Our claimant platform focuses on individuals preparing for federal disability
                benefits programs. Partners are matched based on their specific practice area
                and geographic coverage.
              </p>
              <div className="flex flex-col gap-3">
                {PRACTICE_AREAS.map((area) => (
                  <div key={area} className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-[oklch(50%_0.16_255)] flex-shrink-0" />
                    <span className="text-sm text-[oklch(38%_0.015_255)]">{area}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[oklch(50%_0.16_255)] mb-3">
                Qualification Criteria
              </p>
              <h2 className="font-serif text-3xl font-semibold text-[oklch(20%_0.05_255)] mb-5">
                Who qualifies as a partner
              </h2>
              <p className="text-[oklch(46%_0.015_255)] leading-relaxed mb-7">
                We accept licensed attorneys and certified non-attorney advocates with active
                disability benefits practices and the capacity to respond to leads promptly.
              </p>
              <div className="flex flex-col gap-4">
                {QUALIFICATIONS.map((q, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-[oklch(50%_0.16_255)] flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-[oklch(38%_0.015_255)] leading-relaxed">{q}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Integration steps */}
      <section className="section-py bg-[oklch(20%_0.05_255)] relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "radial-gradient(oklch(100%_0_0) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="container relative z-10">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold uppercase tracking-widest text-[oklch(66%_0.15_255)] mb-3">
              Getting Started
            </p>
            <h2 className="font-serif text-3xl md:text-4xl font-semibold text-white mb-4">
              How to become a partner
            </h2>
            <p className="text-white/55 max-w-xl mx-auto leading-relaxed">
              The onboarding process is straightforward. Most partners are set up and receiving
              leads within a few business days.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-4xl mx-auto">
            {INTEGRATION_STEPS.map((s) => (
              <div
                key={s.step}
                className="p-6 rounded-2xl bg-white/[0.05] border border-white/10 flex flex-col gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-semibold text-white/70">{s.step}</span>
                  </div>
                </div>
                <div>
                  <h3 className="font-serif text-base font-semibold text-white mb-2">{s.title}</h3>
                  <p className="text-sm text-white/55 leading-relaxed">{s.body}</p>
                </div>
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

      {/* Additional details */}
      <section className="section-py bg-white">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              {
                icon: Globe,
                title: "Nationwide Coverage",
                body: "We serve claimants across all 50 states. Partners set their geographic coverage during onboarding and can update it at any time.",
              },
              {
                icon: Zap,
                title: "Fast Onboarding",
                body: "Most partners complete onboarding within 2–3 business days of application approval. No complex technical integration required.",
              },
              {
                icon: Shield,
                title: "Compliance-Ready",
                body: "Every lead includes documented consent and intake data organized to support your firm's intake compliance requirements.",
              },
            ].map((item) => (
              <div key={item.title} className="text-center flex flex-col items-center gap-4 p-6">
                <div className="w-12 h-12 rounded-2xl bg-[oklch(97%_0.02_255)] border border-[oklch(92%_0.01_255)] flex items-center justify-center">
                  <item.icon className="w-5 h-5 text-[oklch(50%_0.16_255)]" />
                </div>
                <h3 className="font-serif text-lg font-semibold text-[oklch(20%_0.05_255)]">{item.title}</h3>
                <p className="text-sm text-[oklch(46%_0.015_255)] leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PageLayout>
  );
}
