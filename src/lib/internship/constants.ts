export const INTEREST_OPTIONS = [
  "Political Analysis",
  "Elections & Data",
  "Content Design",
  "Video / Multimedia",
  "Research",
  "Writing",
  "Other",
] as const;

export const TOOL_OPTIONS = [
  "Canva",
  "Figma",
  "Adobe Suite",
  "CapCut / Premiere",
  "None yet",
  "Other",
] as const;

export const FIELD_LIMITS = {
  name: 120,
  email: 254,
  phone: 40,
  city: 100,
  degree: 120,
  institution: 120,
  year: 4,
  portfolio: 500,
  interestsOther: 120,
  toolsOther: 120,
  why: 2000,
  analysis: 1500,
  videoLink: 500,
  videoNote: 1000,
  hoursPerWeek: 3,
} as const;

export const ANALYSIS_MIN_WORDS = 40;

export type InterestOption = (typeof INTEREST_OPTIONS)[number];
export type ToolOption = (typeof TOOL_OPTIONS)[number];
