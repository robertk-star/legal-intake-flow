import LeadCheckForm from "@/components/LeadCheckForm";
import SiteHeader from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { industries } from "@/data/industries";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  FileText,
  Lock,
  MapPin,
  Phone,
  Search,
  ShieldCheck,
  Star,
  Wrench,
} from "lucide-react";
import { Link } from "wouter";

const checks = [
  {
    icon: Phone,
    title: "Call Readiness",
    text: "Can a ready-to-act customer call quickly, especially from a phone?",
  },
  {
    icon: Search,
    title: "5-Second Service Clarity",
    text: "Does the first screen clearly say what you do and where you work?",
  },
  {
    icon: Star,
    title: "Trust Proof",
    text: "Are reviews, certifications, warranties, photos, and credibility signals easy to see?",
  },
  {
    icon: FileText,
    title: "Estimate / Service Path",
    text: "Is it easy to request an estimate or service without a long, confusing form?",
  },
  {
    icon: MapPin,
    title: "Local Proof",
    text: "Does the site show real service-area relevance and local customer proof?",
  },
  {
    icon: ShieldCheck,
    title: "Foundational Local SEO Gaps",
    text: "Does the site give customers and Google the basic local signals they expect?",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[#f9fafb]">
      <SiteHeader />

      <section id="check" className="bg-gradient-to-b from-white to-[#f9fafb] py-16 md:py-24 border-b-4 border-[#d97706]">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-[#fff7ed] border border-[#fed7aa] px-4 py-2 text-sm font-semibold text-[#9a3412] mb-6">
                <Wrench size={16} /> Multi-niche preview is now active
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-[#1a2332] mb-6 leading-tight">
                Is your local service website leaking leads?
              </h1>
              <p className="text-lg text-[#374151] mb-8 leading-relaxed">
                Before you spend more on ads, SEO, or a new website, find out if your current site is making it harder for customers to call, trust you, or request service.
              </p>
              <LeadCheckForm defaultIndustryId="roofing" />
            </div>

            <div className="hidden md:block">
              <div className="bg-white border border-[#e5e7eb] rounded-xl shadow-lg p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-[#6b7280] uppercase">Free Preview</p>
                    <h2 className="text-xl font-bold text-[#1a2332]">Lead Leak Score</h2>
                  </div>
                  <span className="rounded-full bg-[#fee2e2] text-[#991b1b] px-3 py-1 text-xs font-bold">Example</span>
                </div>
                <div className="text-center py-4">
                  <div className="text-6xl font-bold text-[#d97706] mb-1">58</div>
                  <div className="text-sm font-semibold text-[#6b7280]">/ 100</div>
                  <div className="text-lg font-bold text-[#1a2332] mt-4">Multiple Lead Leaks</div>
                </div>
                <div className="border-t border-[#e5e7eb] pt-6 space-y-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="text-red-500 flex-shrink-0 mt-1" size={20} />
                    <div>
                      <p className="font-semibold text-[#1a2332] text-sm">Critical Leak Found</p>
                      <p className="text-xs text-[#6b7280] mt-1">Phone number not visible near top</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="text-green-500 flex-shrink-0 mt-1" size={20} />
                    <div>
                      <p className="font-semibold text-[#1a2332] text-sm">Top Fix</p>
                      <p className="text-xs text-[#6b7280] mt-1">Add sticky mobile call button</p>
                    </div>
                  </div>
                </div>
                <div className="bg-[#f3f4f6] border-2 border-dashed border-[#d1d5db] rounded p-4 text-center">
                  <Lock className="mx-auto mb-2 text-[#6b7280]" size={20} />
                  <p className="text-sm font-bold text-[#1a2332]">Full Report Locked</p>
                  <p className="text-xs text-[#6b7280] mt-1">Unlock flow comes in a later build</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-white">
        <div className="container">
          <h2 className="text-3xl md:text-4xl font-bold text-[#1a2332] mb-4 text-center">
            More traffic does not help if your website leaks the lead.
          </h2>
          <p className="text-lg text-[#374151] text-center mb-12 max-w-3xl mx-auto">
            Lead Leak Report checks the obvious things that affect calls, trust, estimate requests, and basic local visibility.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="p-6 border border-[#e5e7eb]">
              <Phone className="text-[#d97706] mb-4" size={32} />
              <h3 className="font-bold text-[#1a2332] mb-2">Customers cannot call quickly</h3>
              <p className="text-[#374151] text-sm">Missing, buried, or non-clickable phone numbers can add friction right when someone is ready to act.</p>
            </Card>
            <Card className="p-6 border border-[#e5e7eb]">
              <Star className="text-[#d97706] mb-4" size={32} />
              <h3 className="font-bold text-[#1a2332] mb-2">Trust proof is missing or buried</h3>
              <p className="text-[#374151] text-sm">Reviews, photos, certifications, warranties, and guarantees should show before the customer has doubts.</p>
            </Card>
            <Card className="p-6 border border-[#e5e7eb]">
              <MapPin className="text-[#d97706] mb-4" size={32} />
              <h3 className="font-bold text-[#1a2332] mb-2">Local clarity is weak</h3>
              <p className="text-[#374151] text-sm">Customers and search engines need to know what you do and where you work.</p>
            </Card>
          </div>
        </div>
      </section>

      <section id="industries" className="py-16 md:py-24 bg-[#f9fafb]">
        <div className="container">
          <h2 className="text-3xl md:text-4xl font-bold text-[#1a2332] mb-4 text-center">Built for local service businesses</h2>
          <p className="text-lg text-[#374151] text-center mb-12 max-w-3xl mx-auto">
            Each industry gets its own landing page and keyword set. The same preview engine adapts the checks and language by business type.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {industries.filter((industry) => industry.id !== "home-services").map((industry) => (
              <Link key={industry.id} href={`/${industry.slug}`}>
                <Card className="p-6 h-full border border-[#e5e7eb] hover:border-[#d97706] hover:shadow-md transition cursor-pointer">
                  <h3 className="text-xl font-bold text-[#1a2332] mb-2">{industry.pluralLabel}</h3>
                  <p className="text-sm text-[#374151] mb-4">{industry.subheadline}</p>
                  <span className="inline-flex items-center text-sm font-bold text-[#d97706]">
                    View landing page <ArrowRight className="ml-1" size={16} />
                  </span>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section id="what-we-check" className="py-16 md:py-24 bg-white">
        <div className="container">
          <h2 className="text-3xl md:text-4xl font-bold text-[#1a2332] mb-12 text-center">What the preview checks</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {checks.map((check) => (
              <Card key={check.title} className="p-6 border border-[#e5e7eb]">
                <check.icon className="text-[#d97706] mb-4" size={30} />
                <h3 className="font-bold text-[#1a2332] mb-2">{check.title}</h3>
                <p className="text-[#374151] text-sm">{check.text}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="sample-report" className="py-16 md:py-24 bg-[#1a2332] text-white">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">The paid report will be practical, not technical.</h2>
              <p className="text-[#d1d5db] mb-6">
                Build 1B improves the free preview. The paid report flow comes later with Firecrawl, AI report writing, Stripe, and PDF generation.
              </p>
              <ul className="space-y-3 text-sm text-[#f9fafb]">
                <li className="flex gap-2"><CheckCircle2 className="text-green-400" size={18} /> Top 5 lead leaks</li>
                <li className="flex gap-2"><CheckCircle2 className="text-green-400" size={18} /> Copy/paste fixes</li>
                <li className="flex gap-2"><CheckCircle2 className="text-green-400" size={18} /> Foundational local SEO gaps</li>
                <li className="flex gap-2"><CheckCircle2 className="text-green-400" size={18} /> Send-this-to-your-web-person checklist</li>
              </ul>
            </div>
            <Card className="bg-white text-[#1a2332] p-6 border-2 border-[#d97706]">
              <p className="text-xs font-bold text-[#6b7280] uppercase mb-3">Locked full report preview</p>
              <div className="space-y-3">
                {["Lead Leak Score", "Top 5 Lead Leaks", "Local SEO Gaps", "7-Day Fix Plan", "Web Person Checklist"].map((item) => (
                  <div key={item} className="flex items-center justify-between rounded border border-[#e5e7eb] p-3">
                    <span className="font-semibold">{item}</span>
                    <Lock size={16} className="text-[#6b7280]" />
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </section>

      <section id="faq" className="py-16 md:py-24 bg-white">
        <div className="container max-w-4xl">
          <h2 className="text-3xl md:text-4xl font-bold text-[#1a2332] mb-10 text-center">FAQ</h2>
          <div className="space-y-5">
            {[
              ["Is this an SEO audit?", "No. It is a conversion-first website preview with basic local SEO checks included."],
              ["Does Build 1B charge money?", "No. This build is only the improved free preview foundation. Stripe and paid reports come later."],
              ["What if my site is already strong?", "The preview can show a no-sale recommendation when it does not find enough meaningful issues."],
              ["Do you guarantee more leads?", "No. This is an informational review. Results depend on your website, market, traffic, and implementation."],
            ].map(([question, answer]) => (
              <Card key={question} className="p-6 border border-[#e5e7eb]">
                <h3 className="font-bold text-[#1a2332] mb-2">{question}</h3>
                <p className="text-[#374151]">{answer}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <footer className="bg-[#1a2332] text-white py-10">
        <div className="container flex flex-col md:flex-row justify-between gap-4">
          <div>
            <p className="font-bold text-lg">Lead Leak Report</p>
            <p className="text-sm text-[#d1d5db] mt-1">Website conversion + local visibility checks for service businesses.</p>
          </div>
          <p className="text-xs text-[#9ca3af] max-w-xl">
            This report is an informational website review. It does not guarantee rankings, traffic, calls, or revenue.
          </p>
        </div>
      </footer>
    </div>
  );
}
