# Lead Leak Report — Design Brainstorm

## Context
A SaaS landing page for roofing companies to discover website conversion issues. Target audience: blue-collar business owners who value clarity, trustworthiness, and actionable insights. The product is a paid report ($29) that identifies "lead leaks" on their website.

---

## Approach 1: Industrial Modernism
**Probability: 0.08**

**Design Movement:** Industrial Modernism with construction/engineering aesthetic

**Core Principles:**
- Structural clarity: Every element has a purpose; no decorative flourish
- Material honesty: Use bold typography, strong grid lines, and visible "construction" elements
- Functional hierarchy: Information architecture mirrors how a contractor reads blueprints
- Confidence through simplicity: Dark navy + white + accent orange conveys professionalism and reliability

**Color Philosophy:**
- Primary: Deep navy (#1a2332) — trustworthy, technical, professional
- Accent: Burnt orange (#d97706) — energy, urgency, action (like safety warnings on job sites)
- Secondary: Charcoal gray (#374151) — neutral, grounded
- Background: Off-white (#f9fafb) — clean, readable
- Rationale: Mirrors construction site signage and industrial equipment branding; feels authentic to the roofing industry

**Layout Paradigm:**
- Asymmetric grid with left-aligned text blocks and right-aligned visual elements
- Heavy use of vertical dividers and section breaks (like blueprint sections)
- Staggered card layouts for "What We Check" section (6 cards in 2x3 offset grid)
- Hero form positioned in a dark navy container with orange accents

**Signature Elements:**
1. Bold sans-serif typography (Poppins Bold for headlines, Inter for body)
2. Orange accent lines and borders that frame key sections
3. Minimalist "score cards" with large numbers and small labels (like gauges)
4. Subtle grid background pattern in light gray

**Interaction Philosophy:**
- Buttons have strong, immediate feedback: scale-down on click, orange glow on hover
- Forms have clear focus states with orange underlines
- Cards lift slightly on hover (shadow increase) to indicate interactivity
- Smooth 200ms transitions for all state changes

**Animation:**
- Button hover: Subtle orange glow (box-shadow) + slight scale (1.02x)
- Button click: Scale down (0.97x) with 160ms ease-out
- Card hover: Shadow deepens, slight upward translate (2px)
- Section entrance: Fade-in + subtle slide-up (200ms) for each card in sequence
- Score numbers: Counter animation from 0 to final value (800ms) on page load

**Typography System:**
- Display: Poppins Bold 48px–56px for main headlines (strong, industrial feel)
- Subheading: Inter SemiBold 24px–28px for section headers
- Body: Inter Regular 16px for paragraphs (high readability)
- Accent: Inter Bold 14px for labels and badges
- Rationale: Poppins Bold conveys confidence and strength; Inter provides clean, modern readability

---

## Approach 2: Minimalist SaaS
**Probability: 0.07**

**Design Movement:** Minimalist SaaS with Scandinavian influence

**Core Principles:**
- Less is more: Only essential elements; no visual noise
- Breathing room: Generous whitespace and padding
- Soft, approachable: Rounded corners and subtle colors (not harsh)
- Clarity through simplicity: Users understand the value immediately

**Color Philosophy:**
- Primary: Slate blue (#3b82f6) — modern, trustworthy, calm
- Accent: Teal (#14b8a6) — fresh, forward-thinking
- Neutral: Light gray (#f3f4f6) and dark gray (#374151)
- Background: Pure white (#ffffff)
- Rationale: Soft, approachable palette that feels modern and non-threatening; appeals to business owners who want straightforward solutions

**Layout Paradigm:**
- Centered, single-column layout with max-width container
- Generous vertical spacing between sections (80px–120px gaps)
- Cards with soft shadows (not bold borders)
- Hero section: Centered headline + centered form input

**Signature Elements:**
1. Rounded corners (12px–16px border-radius) throughout
2. Soft blue gradients in backgrounds (subtle, not overwhelming)
3. Minimalist icons (Lucide icons) instead of illustrations
4. Subtle dot patterns or gradient overlays in background

**Interaction Philosophy:**
- Buttons are soft and rounded; hover state adds slight background color shift
- Forms have gentle focus states (light teal underline)
- Smooth, unhurried animations (250ms–300ms)
- Micro-interactions feel delicate and refined

**Animation:**
- Button hover: Subtle background color shift + slight scale (1.01x)
- Button click: Gentle scale-down (0.98x) with 150ms ease-out
- Card hover: Soft shadow increase + slight background color change
- Section entrance: Fade-in only (no movement) for a calm, composed feel
- Scroll animations: Parallax effect on hero background (subtle, 0.3x speed)

**Typography System:**
- Display: Outfit Bold 44px–52px for headlines (modern, geometric)
- Subheading: Outfit SemiBold 22px–26px for section headers
- Body: Inter Regular 16px for paragraphs
- Accent: Inter Medium 14px for labels
- Rationale: Outfit provides a modern, geometric feel; Inter is readable and contemporary

---

## Approach 3: Bold & Conversational
**Probability: 0.09**

**Design Movement:** Bold SaaS with personality and conversational tone

**Core Principles:**
- Human-first: Design speaks directly to the user's pain point
- Visual boldness: Large typography, strong colors, confident imagery
- Storytelling: Each section builds narrative momentum
- Accessibility: High contrast, clear hierarchy, readable at all sizes

**Color Philosophy:**
- Primary: Vibrant blue (#2563eb) — energetic, trustworthy
- Accent: Bright coral (#ff6b6b) — attention-grabbing, urgent
- Secondary: Deep purple (#6d28d9) — premium, sophisticated
- Background: Soft cream (#fffbf0) — warm, inviting
- Rationale: Bold palette that stands out; warm background makes the site feel approachable; coral accent creates urgency for CTAs

**Layout Paradigm:**
- Asymmetric, dynamic layout with overlapping sections
- Hero section: Large headline on left, mock report preview on right
- Alternating left/right layouts for each section
- Full-width colored sections with angled dividers (clip-path)
- Cards with bold borders and strong shadows

**Signature Elements:**
1. Large, bold typography (72px+ headlines)
2. Angled section dividers (clip-path polygons) for visual dynamism
3. Illustrated icons or custom graphics (not minimal icons)
4. Colored backgrounds for key sections (alternating blue, coral, cream)

**Interaction Philosophy:**
- Buttons are bold and prominent; hover state includes color shift + scale
- Cards have strong hover effects (color change, shadow, scale)
- Animations are noticeable and energetic (not subtle)
- Micro-interactions feel playful and engaging

**Animation:**
- Button hover: Color shift + scale (1.05x) + shadow glow
- Button click: Scale down (0.95x) with 180ms ease-out
- Card hover: Scale (1.02x) + shadow increase + color shift
- Section entrance: Staggered fade-in + slide-up (300ms) per card
- Scroll animations: Elements animate in as they enter viewport (Intersection Observer)
- Angled dividers: Subtle skew animation on scroll

**Typography System:**
- Display: Clash Grotesk Bold 56px–72px for headlines (bold, geometric, eye-catching)
- Subheading: Clash Grotesk SemiBold 28px–32px for section headers
- Body: Inter Regular 16px for paragraphs
- Accent: Inter Bold 14px for labels
- Rationale: Clash Grotesk is bold and distinctive; Inter provides modern readability

---

## Design Choice: Industrial Modernism

**Selected Approach:** Approach 1 — Industrial Modernism

**Rationale:**
This approach best serves the target audience (blue-collar business owners) and the product's core value (identifying and fixing website problems). The industrial aesthetic feels authentic to roofing companies, while the structured grid and functional design communicate professionalism and technical expertise. The burnt orange accent creates urgency without being garish, and the dark navy + white palette ensures high readability and trust.

**Key Design Decisions:**
- **Typography:** Poppins Bold for headlines (strong, confident), Inter for body (readable, modern)
- **Color Palette:** Navy (#1a2332), Burnt Orange (#d97706), Charcoal Gray (#374151), Off-white (#f9fafb)
- **Layout:** Asymmetric grid with left-aligned text, right-aligned visuals; staggered card layouts
- **Interactions:** Strong, immediate feedback; orange glows and scale animations
- **Animations:** Counter animations for scores, card hover effects, staggered section entrances
- **Visual Style:** Minimalist score cards, orange accent lines, subtle grid background

This design will feel trustworthy, professional, and actionable—exactly what a roofing company owner needs when evaluating their website's conversion potential.
