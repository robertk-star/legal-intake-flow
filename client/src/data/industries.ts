export type IndustryId = "roofing" | "plumbing" | "electrical" | "hvac" | "landscaping" | "home-services";

export type IndustryConfig = {
  id: IndustryId;
  label: string;
  pluralLabel: string;
  slug: string;
  headline: string;
  subheadline: string;
  customerLabel: string;
  primaryKeywords: string[];
  serviceKeywords: string[];
  urgentKeywords: string[];
  trustKeywords: string[];
  ctaKeywords: string[];
  localSeoKeywords: string[];
  commonCriticalLeak: string;
  exampleFix: string;
};

export const industries: IndustryConfig[] = [
  {
    id: "roofing",
    label: "Roofing",
    pluralLabel: "Roofers",
    slug: "roofers",
    headline: "Is your roofing website leaking leads?",
    subheadline:
      "Find out if your roofing website is making it harder for homeowners to call, trust you, or request an estimate.",
    customerLabel: "homeowners",
    primaryKeywords: ["roofing", "roofer", "roof contractor", "roofing contractor"],
    serviceKeywords: ["roof repair", "roof replacement", "storm damage", "roof inspection", "commercial roofing", "residential roofing"],
    urgentKeywords: ["emergency roof", "storm damage", "leak repair", "hail damage", "24/7"],
    trustKeywords: ["gaf", "owens corning", "certainteed", "bbb", "licensed", "insured", "warranty", "reviews", "testimonials", "stars"],
    ctaKeywords: ["free estimate", "free inspection", "get a quote", "request a quote", "call now", "schedule inspection"],
    localSeoKeywords: ["roof repair", "roof replacement", "roofing contractor", "service area", "near me"],
    commonCriticalLeak: "No clear call or estimate path for urgent roofing visitors.",
    exampleFix: "Add a sticky mobile call button and a clear 'Get Free Roof Inspection' button near the top.",
  },
  {
    id: "plumbing",
    label: "Plumbing",
    pluralLabel: "Plumbers",
    slug: "plumbers",
    headline: "Is your plumbing website leaking service calls?",
    subheadline:
      "Find out if your plumbing website makes it easy for customers to call, book service, and trust you quickly.",
    customerLabel: "customers",
    primaryKeywords: ["plumbing", "plumber", "plumbing contractor"],
    serviceKeywords: ["drain cleaning", "water heater", "leak repair", "sewer", "toilet repair", "pipe repair"],
    urgentKeywords: ["emergency plumber", "24/7", "same day", "after hours", "burst pipe"],
    trustKeywords: ["licensed", "insured", "bbb", "upfront pricing", "warranty", "reviews", "testimonials", "stars", "guarantee"],
    ctaKeywords: ["schedule service", "book online", "call now", "request service", "free estimate", "same day service"],
    localSeoKeywords: ["plumber", "plumbing repair", "drain cleaning", "water heater", "service area"],
    commonCriticalLeak: "Emergency plumbing visitors do not see a fast call or schedule-service path.",
    exampleFix: "Add a prominent 'Call Now' button, same-day service language, and a short request-service form.",
  },
  {
    id: "electrical",
    label: "Electrical",
    pluralLabel: "Electricians",
    slug: "electricians",
    headline: "Is your electrical website making it harder for customers to call?",
    subheadline:
      "Find out if your electrician website clearly shows service, safety, licensing, and a quick request path.",
    customerLabel: "customers",
    primaryKeywords: ["electrician", "electrical", "electrical contractor"],
    serviceKeywords: ["panel upgrade", "ev charger", "lighting", "outlet", "generator", "electrical repair"],
    urgentKeywords: ["emergency electrician", "same day", "24/7", "power outage", "breaker"],
    trustKeywords: ["licensed", "insured", "certified", "bonded", "reviews", "testimonials", "stars", "safety"],
    ctaKeywords: ["schedule service", "call now", "request service", "get estimate", "book appointment"],
    localSeoKeywords: ["electrician", "electrical repair", "panel upgrade", "ev charger", "service area"],
    commonCriticalLeak: "Electrical service and licensing trust signals are not clear enough for a quick decision.",
    exampleFix: "Add licensed electrician language, a phone button, and a short list of key services near the top.",
  },
  {
    id: "hvac",
    label: "HVAC",
    pluralLabel: "HVAC Companies",
    slug: "hvac",
    headline: "Is your HVAC website losing repair and replacement leads?",
    subheadline:
      "Find out if your HVAC website makes AC, furnace, and emergency service customers comfortable enough to call.",
    customerLabel: "homeowners",
    primaryKeywords: ["hvac", "air conditioning", "heating", "furnace", "ac repair"],
    serviceKeywords: ["ac repair", "furnace repair", "hvac installation", "maintenance", "tune up", "heat pump"],
    urgentKeywords: ["emergency hvac", "same day", "24/7", "no heat", "no ac"],
    trustKeywords: ["licensed", "insured", "reviews", "testimonials", "stars", "financing", "warranty", "maintenance plan"],
    ctaKeywords: ["schedule service", "book online", "call now", "request service", "free estimate", "maintenance plan"],
    localSeoKeywords: ["ac repair", "furnace repair", "hvac contractor", "heating and cooling", "service area"],
    commonCriticalLeak: "Repair visitors do not see AC/furnace service and scheduling options quickly enough.",
    exampleFix: "Add AC repair, furnace repair, and 'Schedule Service' buttons near the top of the homepage.",
  },
  {
    id: "landscaping",
    label: "Landscaping",
    pluralLabel: "Landscapers",
    slug: "landscapers",
    headline: "Is your landscaping website losing quote requests?",
    subheadline:
      "Find out if your landscaping website shows enough project proof, local service clarity, and quote-request direction.",
    customerLabel: "property owners",
    primaryKeywords: ["landscaping", "landscaper", "lawn care", "landscape contractor"],
    serviceKeywords: ["landscape design", "lawn care", "hardscaping", "patio", "retaining wall", "maintenance"],
    urgentKeywords: ["seasonal", "weekly", "maintenance plan", "spring cleanup", "snow removal"],
    trustKeywords: ["reviews", "testimonials", "stars", "licensed", "insured", "portfolio", "before and after", "gallery"],
    ctaKeywords: ["free quote", "request quote", "schedule consultation", "call now", "get estimate"],
    localSeoKeywords: ["landscaping", "lawn care", "landscape design", "service area", "near me"],
    commonCriticalLeak: "Project photos and quote-request path are not clear enough to build trust quickly.",
    exampleFix: "Add before/after project photos, city labels, and a clear 'Request a Quote' button near the top.",
  },
  {
    id: "home-services",
    label: "Home Services",
    pluralLabel: "Home Service Businesses",
    slug: "home-services",
    headline: "Is your local service website leaking leads?",
    subheadline:
      "Find out if your website is making it harder for local customers to call, trust you, or request service.",
    customerLabel: "customers",
    primaryKeywords: ["service", "contractor", "repair", "installation", "maintenance"],
    serviceKeywords: ["free estimate", "repair", "installation", "maintenance", "service area"],
    urgentKeywords: ["emergency", "same day", "24/7", "fast service"],
    trustKeywords: ["licensed", "insured", "bbb", "reviews", "testimonials", "stars", "warranty", "guarantee"],
    ctaKeywords: ["call now", "free estimate", "request quote", "schedule service", "contact us"],
    localSeoKeywords: ["service area", "near me", "local", "repair", "contractor"],
    commonCriticalLeak: "Visitors may not see a clear reason to call or request service quickly.",
    exampleFix: "Add a clearer headline, visible phone number, trust proof, and short quote form near the top.",
  },
];

export const defaultIndustry = industries[0];

export function getIndustryById(id?: string | null): IndustryConfig {
  return industries.find((industry) => industry.id === id) || defaultIndustry;
}

export function getIndustryBySlug(slug?: string | null): IndustryConfig | undefined {
  return industries.find((industry) => industry.slug === slug);
}
