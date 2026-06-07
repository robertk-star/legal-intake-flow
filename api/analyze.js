const industries = [
  { id: "roofing", label: "Roofing", pluralLabel: "Roofers", slug: "roofers", headline: "Is your roofing website leaking leads?", subheadline: "Find out if your roofing website is making it harder for homeowners to call, trust you, or request an estimate.", customerLabel: "homeowners", primaryKeywords: ["roofing", "roofer", "roof contractor", "roofing contractor"], serviceKeywords: ["roof repair", "roof replacement", "storm damage", "roof inspection", "commercial roofing", "residential roofing"], urgentKeywords: ["emergency roof", "storm damage", "leak repair", "hail damage", "24/7"], trustKeywords: ["gaf", "owens corning", "certainteed", "bbb", "licensed", "insured", "warranty", "reviews", "testimonials", "stars"], ctaKeywords: ["free estimate", "free inspection", "get a quote", "request a quote", "call now", "schedule inspection"], localSeoKeywords: ["roof repair", "roof replacement", "roofing contractor", "service area", "near me"], commonCriticalLeak: "No clear call or estimate path for urgent roofing visitors.", exampleFix: "Add a sticky mobile call button and a clear 'Get Free Roof Inspection' button near the top." },
  { id: "plumbing", label: "Plumbing", pluralLabel: "Plumbers", slug: "plumbers", headline: "Is your plumbing website leaking service calls?", subheadline: "Find out if your plumbing website makes it easy for customers to call, book service, and trust you quickly.", customerLabel: "customers", primaryKeywords: ["plumbing", "plumber", "plumbing contractor"], serviceKeywords: ["drain cleaning", "water heater", "leak repair", "sewer", "toilet repair", "pipe repair"], urgentKeywords: ["emergency plumber", "24/7", "same day", "after hours", "burst pipe"], trustKeywords: ["licensed", "insured", "bbb", "upfront pricing", "warranty", "reviews", "testimonials", "stars", "guarantee"], ctaKeywords: ["schedule service", "book online", "call now", "request service", "free estimate", "same day service"], localSeoKeywords: ["plumber", "plumbing repair", "drain cleaning", "water heater", "service area"], commonCriticalLeak: "Emergency plumbing visitors do not see a fast call or schedule-service path.", exampleFix: "Add a prominent 'Call Now' button, same-day service language, and a short request-service form." },
  { id: "electrical", label: "Electrical", pluralLabel: "Electricians", slug: "electricians", headline: "Is your electrical website making it harder for customers to call?", subheadline: "Find out if your electrician website clearly shows service, safety, licensing, and a quick request path.", customerLabel: "customers", primaryKeywords: ["electrician", "electrical", "electrical contractor"], serviceKeywords: ["panel upgrade", "ev charger", "lighting", "outlet", "generator", "electrical repair"], urgentKeywords: ["emergency electrician", "same day", "24/7", "power outage", "breaker"], trustKeywords: ["licensed", "insured", "certified", "bonded", "reviews", "testimonials", "stars", "safety"], ctaKeywords: ["schedule service", "call now", "request service", "get estimate", "book appointment"], localSeoKeywords: ["electrician", "electrical repair", "panel upgrade", "ev charger", "service area"], commonCriticalLeak: "Electrical service and licensing trust signals are not clear enough for a quick decision.", exampleFix: "Add licensed electrician language, a phone button, and a short list of key services near the top." },
  { id: "hvac", label: "HVAC", pluralLabel: "HVAC Companies", slug: "hvac", headline: "Is your HVAC website losing repair and replacement leads?", subheadline: "Find out if your HVAC website makes AC, furnace, and emergency service customers comfortable enough to call.", customerLabel: "homeowners", primaryKeywords: ["hvac", "air conditioning", "heating", "furnace", "ac repair"], serviceKeywords: ["ac repair", "furnace repair", "hvac installation", "maintenance", "tune up", "heat pump"], urgentKeywords: ["emergency hvac", "same day", "24/7", "no heat", "no ac"], trustKeywords: ["licensed", "insured", "reviews", "testimonials", "stars", "financing", "warranty", "maintenance plan"], ctaKeywords: ["schedule service", "book online", "call now", "request service", "free estimate", "maintenance plan"], localSeoKeywords: ["ac repair", "furnace repair", "hvac contractor", "heating and cooling", "service area"], commonCriticalLeak: "Repair visitors do not see AC/furnace service and scheduling options quickly enough.", exampleFix: "Add AC repair, furnace repair, and 'Schedule Service' buttons near the top of the homepage." },
  { id: "landscaping", label: "Landscaping", pluralLabel: "Landscapers", slug: "landscapers", headline: "Is your landscaping website losing quote requests?", subheadline: "Find out if your landscaping website shows enough project proof, local service clarity, and quote-request direction.", customerLabel: "property owners", primaryKeywords: ["landscaping", "landscaper", "lawn care", "landscape contractor"], serviceKeywords: ["landscape design", "lawn care", "hardscaping", "patio", "retaining wall", "maintenance"], urgentKeywords: ["seasonal", "weekly", "maintenance plan", "spring cleanup", "snow removal"], trustKeywords: ["reviews", "testimonials", "stars", "licensed", "insured", "portfolio", "before and after", "gallery"], ctaKeywords: ["free quote", "request quote", "schedule consultation", "call now", "get estimate"], localSeoKeywords: ["landscaping", "lawn care", "landscape design", "service area", "near me"], commonCriticalLeak: "Project photos and quote-request path are not clear enough to build trust quickly.", exampleFix: "Add before/after project photos, city labels, and a clear 'Request a Quote' button near the top." },
  { id: "home-services", label: "Home Services", pluralLabel: "Home Service Businesses", slug: "home-services", headline: "Is your local service website leaking leads?", subheadline: "Find out if your website is making it harder for local customers to call, trust you, or request service.", customerLabel: "customers", primaryKeywords: ["service", "contractor", "repair", "installation", "maintenance"], serviceKeywords: ["free estimate", "repair", "installation", "maintenance", "service area"], urgentKeywords: ["emergency", "same day", "24/7", "fast service"], trustKeywords: ["licensed", "insured", "bbb", "reviews", "testimonials", "stars", "warranty", "guarantee"], ctaKeywords: ["call now", "free estimate", "request quote", "schedule service", "contact us"], localSeoKeywords: ["service area", "near me", "local", "repair", "contractor"], commonCriticalLeak: "Visitors may not see a clear reason to call or request service quickly.", exampleFix: "Add a clearer headline, visible phone number, trust proof, and short quote form near the top." },
];

const phonePattern = /(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/;
const getIndustryById = (id) => industries.find((industry) => industry.id === id) || industries[0];
const normalizeUrl = (url) => /^https?:\/\//i.test(String(url || "").trim()) ? String(url).trim() : `https://${String(url || "").trim()}`;
const scoreLabel = (score) => score >= 85 ? "Strong lead path" : score >= 70 ? "Minor leaks found" : score >= 50 ? "Multiple lead leaks" : "Critical lead leaks";
const countMatches = (content, keywords) => keywords.filter((keyword) => content.toLowerCase().includes(keyword.toLowerCase())).length;
const hasAny = (content, keywords) => countMatches(content, keywords) > 0;
const status = (score, max) => score / max >= 0.75 ? "strong" : score / max >= 0.45 ? "needs-review" : "critical";
const category = (key, label, score, max, note) => ({ key, label, score, max, status: status(score, max), note });
const topCriticalTitle = (findings) => findings.find((f) => f.severity === "critical")?.title || findings.find((f) => f.severity === "warning")?.title || "No critical leak found in the preview";
const paidRecommendationFrom = (score, findings, confidence) => {
  const criticalCount = findings.filter((finding) => finding.severity === "critical").length;
  const warningCount = findings.filter((finding) => finding.severity === "warning").length;
  if (criticalCount >= 1 || warningCount >= 3 || score < 78 || (warningCount >= 2 && score < 85)) return "recommended";
  if (confidence === "Basic preview") return "manual-review";
  return "not-recommended";
};
const recommendationText = (rec, industry) => rec === "recommended" ? `This preview found enough possible issues to justify a deeper ${industry.label.toLowerCase()} Lead Leak Report if the business wants exact fixes.` : rec === "manual-review" ? "The automated preview could not read enough of the site to make a confident paid-report recommendation. A manual review or Firecrawl scan should be used before charging." : "The preview did not find enough meaningful issues to confidently recommend a paid report. That no-sale rule protects trust.";
const checklist = (industry) => ["Make the main phone number click-to-call on mobile.", `Make the first headline clearly say ${industry.primaryKeywords[0]} and the main city/service area.`, `Add a clear ${industry.ctaKeywords[0]} button near the top of the page.`, "Add visible reviews, star ratings, or testimonials near the top.", "Add local project photos or service-area proof.", "Shorten forms to 4–5 fields where possible."];

function buildPreviewFromScrape({ url, cityState, email, industryId, html, title = "", description = "", finalUrl }) {
  const industry = getIndustryById(industryId);
  const normalizedUrl = finalUrl || normalizeUrl(url);
  const text = `${title || ""} ${description || ""} ${html}`;
  const lower = text.toLowerCase();
  const city = String(cityState || "").split(",")[0]?.trim().toLowerCase() || "";

  const hasPhone = phonePattern.test(text);
  const hasTelLink = /href=["']tel:/i.test(html);
  const primaryCount = countMatches(text, industry.primaryKeywords);
  const serviceCount = countMatches(text, industry.serviceKeywords);
  const urgentCount = countMatches(text, industry.urgentKeywords);
  const trustCount = countMatches(text, industry.trustKeywords);
  const strongCtaCount = countMatches(text, industry.ctaKeywords);
  const softCtaCount = countMatches(text, ["free consultation", "contact us", "contact", "learn more", "request information"]);
  const ctaCount = strongCtaCount + softCtaCount;
  const localSeoCount = countMatches(text, industry.localSeoKeywords);
  const hasCity = city.length > 1 && lower.includes(city);
  const hasCurrentYear = lower.includes("2026") || lower.includes("2025");
  const hasStaleYear = lower.includes("2020") || lower.includes("2021") || lower.includes("2022");
  const formFieldCount = (html.match(/<(input|textarea|select)\b/gi) || []).length;

  const hasBrokenCta = /href=["']\s*(#|<>|javascript:void\(0\)|javascript:;|\s*)["']/i.test(html);
  const hasVisibleReviewProof = /(\d+[,+]?\s*(?:5[- ]?star|reviews?)|[45]\.\d\s*(?:\/5)?\s*(?:stars?|google)|★★★★★|google rating|star rating|bbb\s*a\+|best of)/i.test(text);
  const hasCertificationProof = /(gaf|owens corning|certainteed|iko|tamko|master elite|select shinglemaster|preferred contractor|licensed|insured|bonded|warranty|guarantee)/i.test(text);
  const hasProjectProof = /(before\s*(?:&|and)?\s*after|recent projects?|project photos?|portfolio|our work|gallery)/i.test(text);
  const hasWeakReviewLinkOnly = /(client reviews|reviews|testimonials)/i.test(text) && !hasVisibleReviewProof;
  const hasFamilyLocalProof = /(family owned|locally owned|local, family|years in business|since\s+\d{4}|serving .+ since)/i.test(text);

  let callScore = 0;
  if (hasPhone) callScore += 11;
  if (hasTelLink) callScore += 8;
  if (strongCtaCount > 0) callScore += 4;
  else if (softCtaCount > 0) callScore += 2;
  if (urgentCount > 0) callScore += 2;

  let clarityScore = 0;
  if (primaryCount > 0) clarityScore += 8;
  if (serviceCount >= 2) clarityScore += 6;
  else if (serviceCount === 1) clarityScore += 3;
  if (hasCity) clarityScore += 4;
  if (title && hasAny(title, industry.primaryKeywords)) clarityScore += 2;

  let trustScore = 0;
  if (hasVisibleReviewProof) trustScore += 7;
  else if (hasWeakReviewLinkOnly) trustScore += 2;
  if (hasCertificationProof) trustScore += 6;
  if (hasProjectProof) trustScore += 3;
  if (hasFamilyLocalProof) trustScore += 2;
  if (trustCount >= 4) trustScore += 2;

  let requestScore = 0;
  if (strongCtaCount > 0) requestScore += 7;
  else if (softCtaCount > 0) requestScore += 4;
  if (/contact|form|quote|estimate|schedule|book|consultation/i.test(text)) requestScore += 3;
  if (formFieldCount > 0 && formFieldCount <= 6) requestScore += 3;
  if (formFieldCount === 0) requestScore += 1;
  if (formFieldCount > 6) requestScore -= 4;
  if (hasBrokenCta) requestScore = Math.min(requestScore, 5);

  let localSeoScore = 0;
  if (hasCity) localSeoScore += 3;
  if (localSeoCount >= 2) localSeoScore += 3;
  else if (localSeoCount === 1) localSeoScore += 1;
  if (serviceCount >= 3) localSeoScore += 2;
  if (/service area|areas served|nearby|county|neighborhood|zip|surrounding areas/i.test(text)) localSeoScore += 2;

  let freshnessScore = 5;
  if (hasCurrentYear) freshnessScore += 3;
  if (!hasStaleYear) freshnessScore += 2;
  if (!hasCurrentYear && hasStaleYear) freshnessScore -= 3;

  callScore = Math.max(0, Math.min(25, callScore));
  clarityScore = Math.max(0, Math.min(20, clarityScore));
  trustScore = Math.max(0, Math.min(20, trustScore));
  requestScore = Math.max(0, Math.min(15, requestScore));
  localSeoScore = Math.max(0, Math.min(10, localSeoScore));
  freshnessScore = Math.max(0, Math.min(10, freshnessScore));

  const categories = [
    category("call", "Call Readiness", callScore, 25, hasPhone ? (hasTelLink ? "Phone and click-to-call found." : "Phone found, but click-to-call was not confirmed.") : "Phone number not found in homepage content."),
    category("clarity", "5-Second Service Clarity", clarityScore, 20, primaryCount > 0 ? "Industry wording found." : "Main service wording was not confirmed."),
    category("trust", "Trust Proof", trustScore, 20, hasVisibleReviewProof || hasCertificationProof ? "Some real trust proof was found." : "Trust proof appears thin, linked-only, or buried."),
    category("path", "Request Path", requestScore, 15, hasBrokenCta ? "A possible broken/placeholder link was detected." : formFieldCount > 6 ? `Form may be high-friction with ${formFieldCount} fields.` : strongCtaCount > 0 ? "Strong request path language found." : "Request path has basic or soft signals."),
    category("seo", "Local Visibility", localSeoScore, 10, hasCity ? "City/service-area signal found." : "City/service-area signal not confirmed."),
    category("freshness", "Freshness", freshnessScore, 10, hasCurrentYear ? "Current year signal found." : hasStaleYear ? "Older dates found without a current year signal." : "Freshness signal was limited."),
  ];

  const findings = [];

  if (!hasPhone) {
    findings.push({
      title: "Critical leak: phone number not found on the homepage",
      severity: "critical",
      category: "Call Readiness",
      explanation: `A local ${industry.label.toLowerCase()} customer should be able to call quickly. The scan did not find a phone number in the homepage content.`,
      evidence: "No standard U.S. phone number pattern was found in the homepage HTML/text.",
      fix: ["Add a phone number to the header.", "Make the number click-to-call.", "Add a mobile call button for urgent visitors."],
    });
  } else if (!hasTelLink) {
    findings.push({
      title: "Phone found, but click-to-call was not confirmed",
      severity: "warning",
      category: "Call Readiness",
      explanation: "Mobile visitors may have to copy/paste or manually dial instead of tapping once to call.",
      evidence: "A phone number was found, but the scan did not find an href=\"tel:\" link.",
      fix: ["Add a tel: link to every visible phone number.", "Use a clear 'Call Now' button.", "Test it on iPhone and Android."],
    });
  }

  if (primaryCount === 0) {
    findings.push({ title: `${industry.label} service clarity may be weak`, severity: "critical", category: "5-Second Service Clarity", explanation: `The scan did not find clear ${industry.label.toLowerCase()} wording in the homepage content. Visitors should know what you do within seconds.`, evidence: `Missing primary terms checked: ${industry.primaryKeywords.slice(0, 4).join(", ")}.`, fix: [`Add '${industry.primaryKeywords[0]}' to the main headline.`, "Avoid using only a brand slogan in the first screen.", "List your core services near the top."] });
  } else if (serviceCount < 2) {
    findings.push({ title: "Core services may not be specific enough", severity: "warning", category: "5-Second Service Clarity", explanation: `The page mentions ${industry.label.toLowerCase()}, but the scan found limited specific service wording.`, evidence: `Only ${serviceCount} specific service keyword(s) were found from the preview list.`, fix: [`Mention services such as ${industry.serviceKeywords.slice(0, 3).join(", ")}.`, "Add links to dedicated service pages.", "Use customer-friendly service names."] });
  }

  if (!hasCity) {
    findings.push({ title: "City or service area was not clearly confirmed", severity: "warning", category: "Local Visibility", explanation: "Local visitors and search engines should quickly understand where the business works.", evidence: city ? `The city '${city}' was not found in the scanned homepage content.` : "No city was parsed from the submitted location.", fix: ["Add the city to the homepage headline or intro.", "List nearby service areas.", "Add local project examples with city labels."] });
  }

  if (!hasVisibleReviewProof && !hasCertificationProof) {
    findings.push({ title: "Trust proof is not strongly visible in the preview", severity: "warning", category: "Trust Proof", explanation: "The scan did not confirm strong proof such as star ratings, review count, BBB/certification badges, warranty, licensing, or insurance language. A reviews link alone is weaker than proof visible on the page.", evidence: hasWeakReviewLinkOnly ? "Review/testimonial wording was found, but no star rating, review count, or certification proof was confirmed." : `Only ${trustCount} trust keyword(s) were found from the preview list.`, fix: ["Add a review or star-rating block near the top.", "Show licenses, insurance, warranties, or certifications.", "Add recent project proof or testimonials."] });
  } else if (!hasVisibleReviewProof) {
    findings.push({ title: "Reviews or star ratings are not clearly visible", severity: "warning", category: "Trust Proof", explanation: "The scan found some credibility signals, but did not confirm visible customer proof like a Google rating, star rating, or review count.", evidence: "Certification/warranty/local proof may exist, but review proof was not confirmed in the homepage scan.", fix: ["Place a Google rating or review count near the first screen.", "Add 2–3 short customer quotes.", "Link the review block to the full review page."] });
  }

  if (hasBrokenCta) {
    findings.push({ title: "Possible broken or placeholder CTA link detected", severity: "critical", category: "Request Path", explanation: "A main action link that points nowhere can stop a ready visitor from contacting the business.", evidence: "The scan detected a placeholder link pattern such as href='#', href='', href='<>' or javascript:void(0).", fix: ["Test every button in the header and hero section.", "Send the main CTA to a real quote/contact form.", "Use a clear action such as 'Get a Free Estimate' or 'Schedule Service'."] });
  } else if (strongCtaCount === 0 && softCtaCount > 0) {
    findings.push({ title: "CTA is present but could be more specific", severity: "warning", category: "Request Path", explanation: "The page has a contact/consultation path, but the wording may be softer than a direct service request. Specific action buttons usually make the next step clearer.", evidence: "Soft CTA wording was found, but the strongest industry-specific CTA terms were not confirmed.", fix: [`Use wording like '${industry.ctaKeywords[0]}' near the top.`, "Repeat the CTA after trust proof sections.", "Tell visitors what happens after they submit."] });
  } else if (ctaCount === 0) {
    findings.push({ title: "No strong call-to-action found", severity: "warning", category: "Request Path", explanation: "The page should give ready-to-act visitors a clear next step, not just general information.", evidence: `No CTA terms were found from this industry list: ${industry.ctaKeywords.slice(0, 4).join(", ")}.`, fix: ["Add a clear CTA button near the top.", `Use wording like '${industry.ctaKeywords[0]}'.`, "Repeat the CTA after trust proof sections."] });
  }

  if (formFieldCount > 6) {
    findings.push({ title: "Contact form may have too much friction", severity: "warning", category: "Request Path", explanation: `The scan found ${formFieldCount} form fields. Long forms can reduce quote or service requests, especially on mobile.`, evidence: `${formFieldCount} input/select/textarea fields were found in the homepage HTML.`, fix: ["Reduce the form to 4–5 key fields.", "Ask for more detail after the first contact.", "Add a clear 'what happens next' line under the form."] });
  }

  if (localSeoCount < 2) {
    findings.push({ title: "Foundational local SEO signals may be light", severity: "warning", category: "Local Visibility", explanation: "The scan found limited local service keywords that help customers and search engines understand what you do.", evidence: `Only ${localSeoCount} foundational local visibility keyword(s) were found.`, fix: ["Add core service terms to the homepage.", "Create dedicated service pages.", "Add a short FAQ section for common local customer questions."] });
  }

  if (!hasCurrentYear && hasStaleYear) {
    findings.push({ title: "Freshness signals may look stale", severity: "warning", category: "Freshness", explanation: "Older dates can make a business look less active, even if the company is still operating.", evidence: "Older year references were found, but no 2025/2026 freshness signal was confirmed.", fix: ["Update copyright and recent project sections.", "Remove outdated notices.", "Add a recent project or seasonal service update."] });
  }

  if (urgentCount === 0 && industry.id !== "landscaping") {
    findings.push({ title: "Urgent-service language was not confirmed", severity: "warning", category: "Call Readiness", explanation: `For ${industry.label.toLowerCase()} businesses, urgent visitors often want to know if same-day or emergency help is available.`, evidence: `No urgent terms were found from this industry list: ${industry.urgentKeywords.slice(0, 4).join(", ")}.`, fix: ["Add emergency, same-day, or urgent-service wording only if you truly offer it.", "Place urgent-service wording near the phone number.", "Create a dedicated urgent-service page if it is a real service."] });
  }

  if (findings.length === 0) {
    findings.push({ title: "No major preview leaks found", severity: "good", category: "Overall", explanation: "The basic scan found a clear service path, local signal, trust wording, and contact path. This site may not need a basic paid report.", evidence: "The homepage passed the main rule-based checks in this preview.", fix: ["Consider a deeper manual review only if you want a second opinion.", "Keep reviews, photos, and service pages current.", "Track call clicks and form submissions."] });
  }

  const rawScore = categories.reduce((sum, category) => sum + category.score, 0);
  let finalScore = Math.max(25, Math.min(99, rawScore));
  if (!hasPhone) finalScore = Math.min(finalScore, 69);
  if (hasPhone && !hasTelLink) finalScore = Math.min(finalScore, 79);
  if (hasBrokenCta) finalScore = Math.min(finalScore, 64);
  if (!hasVisibleReviewProof) finalScore = Math.min(finalScore, 82);
  if (trustScore < 10) finalScore = Math.min(finalScore, 80);
  if (strongCtaCount === 0) finalScore = Math.min(finalScore, 82);
  if (trustScore < 10 && strongCtaCount === 0) finalScore = Math.min(finalScore, 78);

  const paidRecommendation = paidRecommendationFrom(finalScore, findings, "Live homepage preview");
  const localSeoGaps = [
    hasCity ? "City/service area was found in the scanned content." : "Add the main city or service area to the homepage headline or opening section.",
    localSeoCount >= 2 ? "Some foundational service keywords were found." : `Add service terms such as ${industry.localSeoKeywords.slice(0, 3).join(", ")}.`,
    serviceCount >= 3 ? "Multiple core services were found." : "Create or link to dedicated service pages for the top services.",
    /faq/i.test(text) ? "FAQ content appears to be present." : "Add a short FAQ section answering common local customer questions.",
  ];

  return {
    inputUrl: url,
    normalizedUrl,
    cityState,
    email,
    industry,
    score: finalScore,
    label: scoreLabel(finalScore),
    confidence: "Live homepage preview",
    findings: findings.slice(0, 5),
    categories,
    checkedAt: new Date().toISOString(),
    noSaleRecommended: paidRecommendation === "not-recommended",
    paidRecommendation,
    criticalLeakTitle: topCriticalTitle(findings),
    summary: recommendationText(paidRecommendation, industry),
    localSeoGaps,
    webPersonChecklist: checklist(industry),
    nextBestAction:
      paidRecommendation === "recommended"
        ? "Show the locked full report offer once payments are added."
        : paidRecommendation === "manual-review"
          ? "Run a deeper manual or Firecrawl review before charging."
          : "Do not push the paid report unless a deeper scan finds more meaningful issues.",
  };
}

async function scrapeWithFirecrawl(normalizedUrl) {
  const apiKey = process.env.FIRECRAWL_API_KEY || process.env.FIRECRAWL_API_TOKEN;
  if (!apiKey) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);

  try {
    const response = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: normalizedUrl,
        formats: ["markdown", "html", "links"],
        onlyMainContent: false,
        onlyCleanContent: false,
        waitFor: 1000,
        mobile: false,
        removeBase64Images: true,
        blockAds: true,
        proxy: "auto",
        timeout: 20000,
      }),
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`Firecrawl scrape failed with ${response.status}: ${text.slice(0, 160)}`);
    }

    const payload = await response.json();
    if (!payload?.success || !payload?.data) {
      throw new Error(payload?.error || "Firecrawl returned no scrape data");
    }

    const data = payload.data;
    const metadata = data.metadata || {};
    const html = [data.html, data.rawHtml, data.markdown, Array.isArray(data.links) ? data.links.join("\n") : ""]
      .filter(Boolean)
      .join("\n\n");

    if (!html.trim()) throw new Error("Firecrawl returned empty page content");

    return {
      html,
      title: metadata.title || data.title || "",
      description: metadata.description || data.description || "",
      finalUrl: metadata.sourceURL || metadata.url || data.url || normalizedUrl,
      warning: data.warning || metadata.error || "",
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function scrapeWithBasicFetch(normalizedUrl) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);
  try {
    const response = await fetch(normalizedUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 LeadLeakReportPreview/2.0",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    clearTimeout(timeout);
    if (!response.ok) throw new Error(`Could not fetch site. Status ${response.status}`);
    const html = await response.text();
    const meta = extractMeta(html);
    return { html, title: meta.title, description: meta.description, finalUrl: response.url };
  } finally {
    clearTimeout(timeout);
  }
}

function extractMeta(html) {
  const title = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] || "";
  const description = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)?.[1] || "";
  return { title, description };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { url, cityState, email, industryId } = req.body || {};
  if (!url || !cityState || !email) return res.status(400).json({ error: "Missing required fields" });

  const normalizedUrl = normalizeUrl(url);
  const firecrawlConfigured = Boolean(process.env.FIRECRAWL_API_KEY || process.env.FIRECRAWL_API_TOKEN);

  let scrapeData = null;
  let scrapeSource = "basic-fetch";
  let firecrawlError = "";

  if (firecrawlConfigured) {
    try {
      scrapeData = await scrapeWithFirecrawl(normalizedUrl);
      scrapeSource = "firecrawl";
    } catch (error) {
      firecrawlError = error instanceof Error ? error.message : "Firecrawl scrape failed";
    }
  }

  if (!scrapeData) {
    try {
      scrapeData = await scrapeWithBasicFetch(normalizedUrl);
      scrapeSource = firecrawlConfigured ? "basic-fetch-after-firecrawl-fallback" : "basic-fetch";
    } catch (error) {
      return res.status(502).json({
        error: firecrawlConfigured
          ? `Could not read this website with Firecrawl or the fallback fetch. ${firecrawlError ? `Firecrawl note: ${firecrawlError}` : ""}`
          : "Could not read this website yet. Add FIRECRAWL_API_KEY in Build 2 for stronger site reading.",
      });
    }
  }

  const result = buildPreviewFromScrape({
    url,
    cityState,
    email,
    industryId,
    html: String(scrapeData.html || "").slice(0, 500000),
    title: scrapeData.title || "",
    description: scrapeData.description || "",
    finalUrl: scrapeData.finalUrl || normalizedUrl,
  });

  if (scrapeSource === "firecrawl") {
    result.confidence = "Firecrawl homepage preview";
    result.nextBestAction =
      result.paidRecommendation === "recommended"
        ? "Firecrawl read the homepage successfully. This preview is strong enough to show the locked full report offer once payments are added."
        : result.paidRecommendation === "manual-review"
          ? "Firecrawl read the homepage, but a manual review is still recommended before charging."
          : "Firecrawl read the homepage and did not find enough meaningful issues to push a paid report.";
  } else if (scrapeSource === "basic-fetch-after-firecrawl-fallback") {
    result.confidence = "Live homepage preview";
    result.findings = [
      {
        title: "Firecrawl was unavailable; fallback scan used",
        severity: "warning",
        category: "Preview Confidence",
        explanation:
          "The app is configured for Firecrawl, but this scan fell back to the basic homepage reader. The preview may miss JavaScript-rendered content or full-page details.",
        evidence: firecrawlError ? firecrawlError.slice(0, 220) : "Firecrawl did not return usable content.",
        fix: ["Check the FIRECRAWL_API_KEY value in Vercel.", "Confirm the Firecrawl account has credits.", "Run the preview again before charging for a report."],
      },
      ...result.findings,
    ].slice(0, 5);
    result.summary = `${result.summary} Firecrawl fallback was used, so verify the result before charging.`;
  }

  result.scrapeSource = scrapeSource;
  result.firecrawlConfigured = firecrawlConfigured;

  res.status(200).json(result);
}
