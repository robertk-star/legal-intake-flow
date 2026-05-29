import { z } from "zod";

export const PRACTICE_AREAS = [
  "Social Security Disability",
  "SSI",
  "SSDI",
  "Veterans Disability",
  "Workers' Compensation",
  "Personal Injury",
  "Other",
] as const;

export const MONTHLY_CAPACITIES = [
  "1–10",
  "11–25",
  "26–50",
  "51–100",
  "100+",
] as const;

export const partnerAccessSchema = z.object({
  // Required contact fields
  firstName:           z.string().min(1, "First name is required").max(100).trim(),
  lastName:            z.string().min(1, "Last name is required").max(100).trim(),
  firmName:            z.string().min(1, "Firm or organization name is required").max(300).trim(),
  email:               z.string().min(1, "Email address is required").email("Enter a valid email address").max(320),
  phone:               z.string().min(1, "Phone number is required").max(40).trim(),

  // Required practice fields
  statesServed:        z.string().min(1, "State(s) served is required").max(2000).trim(),
  practiceArea:        z.enum(PRACTICE_AREAS, { error: "Select a practice area" }),
  monthlyLeadCapacity: z.enum(MONTHLY_CAPACITIES, { error: "Select an estimated monthly capacity" }),

  // Optional fields
  website:             z.string().max(500).trim().optional(),
  message:             z.string().max(5000).trim().optional(),

  // Honeypot — must be empty; bots fill it, humans do not see it
  companyWebsite:      z.string().max(200).optional(),
});

export type PartnerAccessInput = z.infer<typeof partnerAccessSchema>;
