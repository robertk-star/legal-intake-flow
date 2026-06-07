import SiteHeader from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { buildFallbackPreview, type PreviewCategory, type PreviewFinding, type PreviewResult } from "@/lib/localPreview";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  Lock,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";

function getSeverityStyles(severity: PreviewFinding["severity"]) {
  if (severity === "critical") {
    return { icon: <AlertCircle className="text-red-500 flex-shrink-0 mt-1" size={24} />, badge: "bg-red-100 text-red-700", label: "Critical" };
  }
  if (severity === "good") {
    return { icon: <CheckCircle2 className="text-green-500 flex-shrink-0 mt-1" size={24} />, badge: "bg-green-100 text-green-700", label: "Good" };
  }
  return { icon: <AlertCircle className="text-yellow-600 flex-shrink-0 mt-1" size={24} />, badge: "bg-yellow-100 text-yellow-800", label: "Needs Review" };
}

function getCategoryStyles(status: PreviewCategory["status"]) {
  if (status === "strong") return { bar: "bg-green-600", badge: "bg-green-100 text-green-700", label: "Strong" };
  if (status === "critical") return { bar: "bg-red-600", badge: "bg-red-100 text-red-700", label: "Critical" };
  return { bar: "bg-yellow-500", badge: "bg-yellow-100 text-yellow-800", label: "Needs Review" };
}

function getRecommendationBox(result: PreviewResult) {
  if (result.paidRecommendation === "recommended") {
    return {
      title: "Full Report Locked",
      body: "This preview found enough possible issues to justify a deeper paid report once Stripe and PDF generation are added.",
      tone: "border-[#d97706]",
      button: "Unlock Full Report — Coming Later",
    };
  }
  if (result.paidRecommendation === "manual-review") {
    return {
      title: "Manual review recommended before charging",
      body: "The live preview could not verify enough site content. Build 2 should add Firecrawl before asking this visitor to pay.",
      tone: "border-yellow-400",
      button: "Paid Report Disabled",
    };
  }
  return {
    title: "Paid report not recommended yet",
    body: "This preview did not find enough meaningful issues to confidently recommend a paid report. That no-sale rule is part of the product.",
    tone: "border-green-400",
    button: "Paid Report Not Needed",
  };
}

export default function Preview() {
  const [location, setLocation] = useLocation();
  const params = useMemo(() => new URLSearchParams(location.split("?")[1] || ""), [location]);
  const url = params.get("url") || "";
  const cityState = params.get("location") || "";
  const email = params.get("email") || "";
  const industryId = params.get("industry") || "roofing";

  const [result, setResult] = useState<PreviewResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadPreview() {
      setHasAttemptedLoad(false);
      setError(null);

      const stored = sessionStorage.getItem("leadLeakPreviewResult");
      const storedError = sessionStorage.getItem("leadLeakPreviewError");

      if (stored) {
        try {
          const parsed = JSON.parse(stored) as PreviewResult;
          if (!cancelled) {
            setResult(parsed);
            setError(storedError);
            setHasAttemptedLoad(true);
          }
          return;
        } catch {
          sessionStorage.removeItem("leadLeakPreviewResult");
          sessionStorage.removeItem("leadLeakPreviewError");
        }
      }

      if (!url || !cityState || !email) {
        if (!cancelled) {
          setResult(null);
          setHasAttemptedLoad(true);
        }
        return;
      }

      setLoading(true);
      const fallback = buildFallbackPreview({ url, cityState, email, industryId });

      try {
        const response = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url, cityState, email, industryId }),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.error || "The live preview could not read this site yet.");
        }

        const data = (await response.json()) as PreviewResult;
        sessionStorage.setItem("leadLeakPreviewResult", JSON.stringify(data));
        sessionStorage.removeItem("leadLeakPreviewError");
        if (!cancelled) setResult(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : "The live preview could not run.";
        sessionStorage.setItem("leadLeakPreviewResult", JSON.stringify(fallback));
        sessionStorage.setItem("leadLeakPreviewError", message);
        if (!cancelled) {
          setResult(fallback);
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setHasAttemptedLoad(true);
        }
      }
    }

    loadPreview();
    return () => {
      cancelled = true;
    };
  }, [url, cityState, email, industryId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f9fafb]">
        <SiteHeader />
        <div className="container py-16">
          <Card className="max-w-2xl mx-auto p-8 text-center border border-[#e5e7eb]">
            <RefreshCw className="mx-auto mb-4 animate-spin text-[#d97706]" size={36} />
            <h1 className="text-2xl font-bold text-[#1a2332] mb-2">Checking your website preview...</h1>
            <p className="text-[#374151]">Running basic lead leak checks for {cityState || "your service area"}.</p>
          </Card>
        </div>
      </div>
    );
  }

  if (hasAttemptedLoad && !result) {
    return (
      <div className="min-h-screen bg-[#f9fafb]">
        <SiteHeader />
        <div className="container py-16">
          <Card className="max-w-2xl mx-auto p-8 text-center border border-[#e5e7eb]">
            <FileText className="mx-auto mb-4 text-[#d97706]" size={40} />
            <h1 className="text-2xl font-bold text-[#1a2332] mb-3">Run a website check first</h1>
            <p className="text-[#374151] mb-6">
              No preview result was found. Enter a website, business type, city/state, and email from the homepage or an industry page to generate a real preview.
            </p>
            <Button onClick={() => setLocation("/")} className="bg-[#d97706] hover:bg-[#b45309] text-white font-bold">
              Start Website Check
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  if (!result) return null;

  const scoreColor = result.score >= 85 ? "text-green-600" : result.score >= 70 ? "text-[#d97706]" : result.score >= 50 ? "text-yellow-600" : "text-red-600";
  const recommendationBox = getRecommendationBox(result);

  return (
    <div className="min-h-screen bg-[#f9fafb]">
      <SiteHeader />

      <div className="container py-10 md:py-16">
        <div className="mb-8">
          <Button onClick={() => setLocation("/")} variant="outline" className="mb-6">
            ← Back to Home
          </Button>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-[#d97706] mb-2">{result.industry.label} Lead Leak Preview</p>
              <h1 className="text-3xl md:text-4xl font-bold text-[#1a2332] mb-2">Free preview result</h1>
              <p className="text-[#374151] break-all">{result.normalizedUrl || "No website URL entered"}</p>
            </div>
            <div className="flex items-center gap-3 text-sm text-[#6b7280]">
              <MapPin size={18} className="text-[#d97706]" />
              <span>{result.cityState || "No city/state entered"}</span>
            </div>
          </div>
        </div>

        {error && (
          <Card className="mb-8 p-4 border border-yellow-200 bg-yellow-50 text-yellow-900">
            <p className="text-sm">
              <strong>Note:</strong> {error} Showing a fallback preview. Check the Firecrawl key or site access if this should have used the enhanced reader.
            </p>
          </Card>
        )}

        <div className="grid lg:grid-cols-3 gap-8 mb-10">
          <Card className="lg:col-span-2 bg-white border-2 border-[#d97706] p-8">
            <div className="grid md:grid-cols-[180px_1fr] gap-8 items-center mb-8">
              <div className="text-center">
                <div className={`text-7xl font-bold ${scoreColor} mb-2`}>{result.score}</div>
                <div className="text-sm font-semibold text-[#6b7280]">/ 100</div>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-[#1a2332] mb-2">{result.label}</h2>
                <p className="text-[#374151] mb-4">{result.summary}</p>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center rounded-full bg-[#f3f4f6] px-3 py-1 text-xs font-bold text-[#374151]">{result.confidence}</span>
                  <span className="inline-flex items-center rounded-full bg-[#fff7ed] px-3 py-1 text-xs font-bold text-[#b45309]">{result.paidRecommendation.replace("-", " ")}</span>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-[#e5e7eb] bg-[#f9fafb] p-5 mb-8">
              <p className="text-xs font-bold uppercase tracking-wide text-[#6b7280] mb-1">Critical leak alert</p>
              <p className="font-bold text-[#1a2332]">{result.criticalLeakTitle}</p>
              <p className="text-sm text-[#374151] mt-2">{result.nextBestAction}</p>
            </div>

            <div className="border-t border-[#e5e7eb] pt-8">
              <h3 className="font-bold text-[#1a2332] mb-6">Preview Findings</h3>
              <div className="space-y-6">
                {result.findings.map((finding, index) => {
                  const styles = getSeverityStyles(finding.severity);
                  return (
                    <div key={`${finding.title}-${index}`} className="pb-6 border-b border-[#e5e7eb] last:border-0 last:pb-0">
                      <div className="flex items-start gap-4">
                        {styles.icon}
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <h4 className="font-bold text-[#1a2332]">{finding.title}</h4>
                            <span className={`rounded-full px-2 py-1 text-[11px] font-bold ${styles.badge}`}>{styles.label}</span>
                            {finding.category && <span className="rounded-full bg-[#f3f4f6] px-2 py-1 text-[11px] font-bold text-[#6b7280]">{finding.category}</span>}
                          </div>
                          <p className="text-[#374151] text-sm mb-3">{finding.explanation}</p>
                          {finding.evidence && <p className="text-xs text-[#6b7280] mb-3"><strong>Evidence:</strong> {finding.evidence}</p>}
                          <div className="bg-[#f9fafb] border border-[#e5e7eb] rounded p-3">
                            <p className="text-xs font-semibold text-[#6b7280] mb-2">Possible Fix:</p>
                            <ul className="text-xs text-[#374151] space-y-1">
                              {finding.fix.map((fix) => (
                                <li key={fix}>• {fix}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>

          <div className="space-y-6">
            <Card className="bg-white border border-[#e5e7eb] p-6">
              <Clock className="text-[#d97706] mb-3" size={24} />
              <p className="text-xs font-semibold text-[#6b7280] mb-1">CHECKED</p>
              <p className="font-semibold text-[#1a2332]">{new Date(result.checkedAt).toLocaleString()}</p>
            </Card>
            <Card className="bg-white border border-[#e5e7eb] p-6">
              <ShieldCheck className="text-[#d97706] mb-3" size={24} />
              <p className="text-xs font-semibold text-[#6b7280] mb-1">BUSINESS TYPE</p>
              <p className="font-semibold text-[#1a2332]">{result.industry.label}</p>
            </Card>
            <Card className="bg-white border border-[#e5e7eb] p-6">
              <Search className="text-[#d97706] mb-3" size={24} />
              <p className="text-xs font-semibold text-[#6b7280] mb-1">LOCAL SEO</p>
              <p className="font-semibold text-[#1a2332] text-sm">Basic visibility gaps included</p>
            </Card>
          </div>
        </div>

        <Card className="bg-white border border-[#e5e7eb] p-8 mb-10">
          <h3 className="font-bold text-[#1a2332] mb-6">What the preview checked</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {result.categories.map((category) => {
              const styles = getCategoryStyles(category.status);
              const width = `${Math.round((category.score / category.max) * 100)}%`;
              return (
                <div key={category.key} className="rounded-lg border border-[#e5e7eb] p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="font-bold text-[#1a2332]">{category.label}</p>
                      <p className="text-xs text-[#6b7280] mt-1">{category.note}</p>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${styles.badge}`}>{styles.label}</span>
                  </div>
                  <div className="h-2 rounded-full bg-[#e5e7eb] overflow-hidden mb-2">
                    <div className={`h-full ${styles.bar}`} style={{ width }} />
                  </div>
                  <p className="text-xs font-semibold text-[#6b7280]">{category.score}/{category.max} points</p>
                </div>
              );
            })}
          </div>
        </Card>

        <div className="grid lg:grid-cols-2 gap-8 mb-10">
          <Card className="bg-white border border-[#e5e7eb] p-8">
            <div className="flex items-center gap-3 mb-4">
              <Search className="text-[#d97706]" size={24} />
              <h3 className="font-bold text-[#1a2332]">Foundational Local SEO Preview</h3>
            </div>
            <p className="text-sm text-[#374151] mb-4">This is not a full SEO audit. These are basic visibility checks that add value to the report without turning it into a rankings tool.</p>
            <ul className="space-y-2 text-sm text-[#374151]">
              {result.localSeoGaps.map((gap) => (
                <li key={gap} className="flex gap-2"><CheckCircle2 className="text-[#d97706] flex-shrink-0 mt-0.5" size={16} /> {gap}</li>
              ))}
            </ul>
          </Card>

          <Card className="bg-white border border-[#e5e7eb] p-8">
            <div className="flex items-center gap-3 mb-4">
              <Wrench className="text-[#d97706]" size={24} />
              <h3 className="font-bold text-[#1a2332]">Send This to Your Web Person Preview</h3>
            </div>
            <p className="text-sm text-[#374151] mb-4">The paid report will turn findings into a forwardable checklist. This preview shows the type of action list we will provide.</p>
            <ul className="space-y-2 text-sm text-[#374151]">
              {result.webPersonChecklist.slice(0, 5).map((item) => (
                <li key={item} className="flex gap-2"><CheckCircle2 className="text-[#d97706] flex-shrink-0 mt-0.5" size={16} /> {item}</li>
              ))}
            </ul>
          </Card>
        </div>

        <Card className={`bg-gradient-to-br from-[#1a2332] to-[#2d3e52] border-2 ${recommendationBox.tone} p-8 md:p-12 text-white mb-10`}>
          <div className="flex items-start gap-6">
            <Lock className="text-[#d97706] flex-shrink-0 mt-1" size={32} />
            <div className="flex-1">
              <h3 className="text-2xl font-bold mb-3">{recommendationBox.title}</h3>
              <p className="text-[#d1d5db] mb-6">{recommendationBox.body}</p>
              <div className="grid md:grid-cols-2 gap-4 mb-8 bg-[#374151] bg-opacity-50 p-6 rounded-lg">
                {["Top 5 Lead Leaks", "Copy/Paste Fixes", "Local SEO Gap Check", "Web Person Checklist", "7-Day Fix Plan", "Shareable Report Link"].map((item) => (
                  <div key={item} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 size={16} className="text-green-400 flex-shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button disabled className="bg-[#d97706] text-white font-bold text-lg py-6 px-8 disabled:opacity-70">{recommendationBox.button}</Button>
                <Button onClick={() => setLocation("/")} variant="outline" className="border-white text-white hover:bg-white hover:text-[#1a2332] font-bold text-lg py-6 px-8">Run Another Preview</Button>
              </div>
            </div>
          </div>
        </Card>

        <Card className="bg-white border border-[#e5e7eb] p-8">
          <h3 className="font-bold text-[#1a2332] mb-4">About Build 2A</h3>
          <p className="text-[#374151] mb-4">
            This build fixes the preview submission flow. Forms now run the analyzer first, store the real result in sessionStorage, and then open the preview page. Visiting /preview directly now shows a clean empty state instead of a fake fallback score.
          </p>
          <p className="text-[#374151] mb-4">
            The next build should add screenshot/mobile first-screen checks before adding AI-generated full reports, Stripe, PDF generation, or a database.
          </p>
          <p className="text-sm text-[#6b7280]"><strong>Disclaimer:</strong> This preview is an informational website review. It does not guarantee rankings, traffic, calls, or revenue.</p>
        </Card>
      </div>
    </div>
  );
}
