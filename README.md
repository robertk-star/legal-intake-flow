# Legal Intake Flow

**Domain:** legalintakeflow.com

Legal Intake Flow is an attorney and advocate partner platform that connects disability benefits claimants with licensed legal professionals. The platform delivers pre-screened, consent-based leads to partner attorneys and advocates specializing in SSDI and SSI cases.

---

## Stack

- **Frontend:** React 19 + Vite + TypeScript + Tailwind CSS v4
- **Backend:** Express 4 + tRPC 11
- **Database:** Drizzle ORM + MySQL (TiDB)
- **Auth:** Manus OAuth
- **Testing:** Vitest

---

## Pages

| Route | Page |
|---|---|
| `/` | Home — hero, how it works, value props, attorney benefits, FAQ, CTA |
| `/how-it-works` | Detailed 6-step process walkthrough |
| `/for-attorneys` | Attorney/advocate partner benefits and onboarding |
| `/request-access` | Partner access request form |
| `/privacy` | Privacy Policy |
| `/terms` | Terms of Use |

---

## Development

```bash
pnpm install
pnpm dev
```

## Build

```bash
pnpm build
```

## Type Check

```bash
pnpm tsc --noEmit
```

## Tests

```bash
pnpm test
```

## Database

```bash
pnpm db:push
```

---

## Contact

Partner inquiries: partners@legalintakeflow.com
Legal: legal@legalintakeflow.com
