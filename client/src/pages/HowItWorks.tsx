import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import PageLayout from "@/components/PageLayout";
import {
  ArrowRight,
  ClipboardList,
  BadgeCheck,
  Handshake,
  FileSearch,
  UserCheck,
  PhoneCall,
  CheckCircle2,
} from "lucide-react";

const STEPS = [
  {
    icon: ClipboardList,
    number: "01",
    title: "Claimant Completes the Screening",
    body: "An individual preparing to apply for SSDI or SSI benefits completes a structured intake questionnaire covering medical conditions, work history, prior applications, and current readiness — giving a comprehensive picture of their situation before any attorney contact.",
    detail: [
      "Medical conditions and diagnoses",
      "Work history and last date of substantial gainful activity",
      "Prior application history and appeal status",
      "Current documentation and medical records availability",
    ],
  },
  {
    icon: FileSearch,
    number: "02",
    title: "Readiness Assessment",
    body: "The platform evaluates the claimant's responses against established SSDI and SSI eligibility criteria. A readiness score is generated based on the completeness and strength of the claimant's documented situation. This score helps partners prioritize follow-up and allocate intake resources effectively.",
    detail: [
      "Eligibility criteria cross-reference",
      "Documentation completeness score",
      "Case complexity indicator",
      "Recommended next steps for the claimant",
    ],
  },
  {
    icon: BadgeCheck,
    number: "03",
    title: "Consent Collection",
    body: "Before any lead is shared with a partner, the claimant must explicitly consent to being contacted by legal professionals. Consent is collected at the point of screening completion, documented with a timestamp, and stored securely. No lead enters the partner network without this step.",
    detail: [
      "Explicit opt-in consent language",
      "Timestamped consent record",
      "Clear disclosure of attorney contact",
      "Claimant right to withdraw",
    ],
  },
  {
    icon: UserCheck,
    number: "04",
    title: "Partner Matching",
    body: "Consented leads are matched to partner attorneys and advocates based on geographic coverage, practice area, and current intake capacity. Partners set their preferences during onboarding and can update them at any time. Matching ensures leads arrive where they can be acted on promptly.",
    detail: [
      "State and geographic coverage matching",
      "SSDI vs. SSI case type alignment",
      "Partner intake capacity management",
      "Priority routing for high-readiness leads",
    ],
  },
  {
    icon: Handshake,
    number: "05",
    title: "Lead Delivery",
    body: "The matched partner receives a structured lead package containing the claimant's organized intake data, readiness score, consent documentation, and recommended follow-up timing. Leads are delivered through the partner dashboard with all information formatted for immediate intake team use.",
    detail: [
      "Organized claimant intake data",
      "Readiness score and case summary",
      "Consent documentation included",
      "Recommended contact window",
    ],
  },
  {
    icon: PhoneCall,
    number: "06",
    title: "Attorney Follow-Up",
    body: "The partner attorney or advocate contacts the claimant within the recommended window. Because the claimant has already completed a structured screening and consented to contact, the initial conversation is more productive — both parties arrive prepared.",
    detail: [
      "Claimant expects contact",
      "Pre-organized case information",
      "Reduced intake call time",
      "Higher conversion to representation",
    ],
  },
];

export default function HowItWorks() {
  return (
    <PageLayout>
      {/* Page header */}
      <section className="bg-[oklch(20%_0.05_255)] py-20">
        <div className="container">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-[oklch(66%_0.15_255)] mb-4">
              The Process
            </p>
            <h1 className="font-serif text-4xl md:text-5xl font-semibold text-white mb-5 leading-tight">
              How Legal Intake Flow Works
            </h1>
            <p className="text-white/60 text-lg leading-relaxed">
              A structured, six-step pipeline from claimant screening to attorney connection —
              built around consent, quality, and efficiency.
            </p>
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="section-py bg-white">
        <div className="container">
          <div className="max-w-3xl mx-auto flex flex-col gap-0">
            {STEPS.map((step, i) => (
              <div key={step.number} className="relative flex gap-8 pb-14 last:pb-0">
                {/* Vertical connector */}
                {i < STEPS.length - 1 && (
                  <div className="absolute left-[22px] top-14 bottom-0 w-px bg-[oklch(92%_0.01_255)]" />
                )}

                {/* Icon bubble */}
                <div className="flex-shrink-0 w-11 h-11 rounded-full bg-[oklch(20%_0.05_255)] flex items-center justify-center shadow-md z-10">
                  <step.icon className="w-5 h-5 text-white" />
                </div>

                {/* Content */}
                <div className="flex-1 pt-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xs font-semibold text-[oklch(58%_0.015_255)] tracking-widest uppercase">
                      Step {step.number}
                    </span>
                  </div>
                  <h2 className="font-serif text-xl font-semibold text-[oklch(20%_0.05_255)] mb-3">
                    {step.title}
                  </h2>
                  <p className="text-sm text-[oklch(46%_0.015_255)] leading-relaxed mb-5">
                    {step.body}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {step.detail.map((d) => (
                      <div key={d} className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[oklch(50%_0.16_255)] flex-shrink-0 mt-0.5" />
                        <span className="text-xs text-[oklch(46%_0.015_255)]">{d}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section-py bg-[oklch(97%_0.02_255)]">
        <div className="container">
          <div className="max-w-xl mx-auto text-center">
            <h2 className="font-serif text-2xl md:text-3xl font-semibold text-[oklch(20%_0.05_255)] mb-4">
              Ready to join the network?
            </h2>
            <p className="text-[oklch(46%_0.015_255)] mb-8 leading-relaxed">
              Submit a request to become a Legal Intake Flow partner and start receiving
              structured, consent-based disability leads.
            </p>
            <Link href="/request-access">
              <Button className="bg-[oklch(20%_0.05_255)] hover:bg-[oklch(26%_0.06_255)] text-white rounded-xl h-11 px-8 text-sm font-semibold shadow-sm">
                Request Access
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </PageLayout>
  );
}
