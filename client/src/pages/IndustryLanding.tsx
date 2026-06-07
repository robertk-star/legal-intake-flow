import LeadCheckForm from "@/components/LeadCheckForm";
import SiteHeader from "@/components/SiteHeader";
import { Card } from "@/components/ui/card";
import { getIndustryBySlug } from "@/data/industries";
import { AlertCircle, CheckCircle2, FileText, MapPin, Phone, Search, Star } from "lucide-react";
import { useRoute } from "wouter";
import NotFound from "./NotFound";

export default function IndustryLanding() {
  const [, params] = useRoute("/:slug");
  const industry = getIndustryBySlug(params?.slug);

  if (!industry) return <NotFound />;

  const examples = [
    `No clear ${industry.ctaKeywords[0]} button near the top`,
    `${industry.primaryKeywords[0]} and service area are not clear in the first screen`,
    "Reviews, project proof, or trust signals are missing or buried",
    `Key services like ${industry.serviceKeywords.slice(0, 2).join(" and ")} are not easy to find`,
  ];

  return (
    <div className="min-h-screen bg-[#f9fafb]">
      <SiteHeader />
      <section id="check" className="bg-gradient-to-b from-white to-[#f9fafb] py-16 md:py-24 border-b-4 border-[#d97706]">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-[#d97706] mb-4">Lead Leak Report for {industry.pluralLabel}</p>
              <h1 className="text-4xl md:text-5xl font-bold text-[#1a2332] mb-6 leading-tight">{industry.headline}</h1>
              <p className="text-lg text-[#374151] mb-8 leading-relaxed">{industry.subheadline}</p>
              <div className="grid sm:grid-cols-2 gap-4 mb-8">
                <div className="flex items-start gap-3">
                  <Phone className="text-[#d97706] flex-shrink-0 mt-1" size={20} />
                  <p className="text-sm text-[#374151]">Check call and contact friction.</p>
                </div>
                <div className="flex items-start gap-3">
                  <Search className="text-[#d97706] flex-shrink-0 mt-1" size={20} />
                  <p className="text-sm text-[#374151]">Check local visibility basics.</p>
                </div>
                <div className="flex items-start gap-3">
                  <Star className="text-[#d97706] flex-shrink-0 mt-1" size={20} />
                  <p className="text-sm text-[#374151]">Check trust proof and reviews.</p>
                </div>
                <div className="flex items-start gap-3">
                  <FileText className="text-[#d97706] flex-shrink-0 mt-1" size={20} />
                  <p className="text-sm text-[#374151]">Preview first. Paid report later.</p>
                </div>
              </div>
            </div>
            <LeadCheckForm defaultIndustryId={industry.id} />
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-white">
        <div className="container">
          <h2 className="text-3xl md:text-4xl font-bold text-[#1a2332] text-center mb-4">Common {industry.label.toLowerCase()} lead leaks</h2>
          <p className="text-lg text-[#374151] text-center mb-12 max-w-3xl mx-auto">
            The preview looks for practical issues that can make {industry.customerLabel} hesitate, leave, or choose a competitor.
          </p>
          <div className="grid md:grid-cols-2 gap-5">
            {examples.map((example) => (
              <Card key={example} className="p-6 border border-[#e5e7eb]">
                <div className="flex items-start gap-3">
                  <AlertCircle className="text-[#d97706] flex-shrink-0 mt-1" size={22} />
                  <p className="font-semibold text-[#1a2332]">{example}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-[#1a2332] text-white">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">What the full report will unlock later</h2>
              <p className="text-[#d1d5db] mb-6">
                Build 1B validates the free preview flow. The paid report will give specific fixes and a web-person checklist.
              </p>
              <ul className="space-y-3">
                <li className="flex gap-2"><CheckCircle2 className="text-green-400" size={18} /> Top 5 lead leaks for {industry.label.toLowerCase()}</li>
                <li className="flex gap-2"><CheckCircle2 className="text-green-400" size={18} /> Copy/paste headline and CTA fixes</li>
                <li className="flex gap-2"><CheckCircle2 className="text-green-400" size={18} /> Foundational local SEO gaps</li>
                <li className="flex gap-2"><CheckCircle2 className="text-green-400" size={18} /> Send-this-to-your-web-person checklist</li>
              </ul>
            </div>
            <Card className="bg-white text-[#1a2332] p-6 border-2 border-[#d97706]">
              <p className="text-xs font-bold uppercase text-[#6b7280] mb-3">Example top fix</p>
              <h3 className="text-xl font-bold mb-2">{industry.commonCriticalLeak}</h3>
              <p className="text-[#374151]">{industry.exampleFix}</p>
            </Card>
          </div>
        </div>
      </section>

      <footer className="bg-[#111827] text-white py-10">
        <div className="container flex flex-col md:flex-row justify-between gap-4">
          <div>
            <p className="font-bold text-lg">Lead Leak Report</p>
            <p className="text-sm text-[#d1d5db] mt-1">Website conversion + local visibility checks for {industry.pluralLabel.toLowerCase()}.</p>
          </div>
          <p className="text-xs text-[#9ca3af] max-w-xl">
            This report is an informational website review. It does not guarantee rankings, traffic, calls, or revenue.
          </p>
        </div>
      </footer>
    </div>
  );
}
