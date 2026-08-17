import { z } from "zod";

// Common password rules, shared between the signup form's live strength
// meter and the server-side validation in src/app/signup/actions.ts, so the
// two can never disagree about what "strong enough" means.
export const PasswordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .regex(/[a-z]/, "Password must include a lowercase letter.")
  .regex(/[A-Z]/, "Password must include an uppercase letter.")
  .regex(/[0-9]/, "Password must include a number.")
  .regex(/[^A-Za-z0-9]/, "Password must include a special character.");

export type PasswordStrength = {
  score: number; // 0-4
  label: "Very weak" | "Weak" | "Fair" | "Good" | "Strong";
  checks: {
    length: boolean;
    case: boolean;
    number: boolean;
    special: boolean;
  };
};

const STRENGTH_LABELS: PasswordStrength["label"][] = [
  "Very weak",
  "Weak",
  "Fair",
  "Good",
  "Strong",
];

// One check per PasswordSchema rule (the case-sensitivity rules are
// combined into a single "case" check) -- a score of 4 means the password
// satisfies every rule PasswordSchema enforces server-side.
export function getPasswordStrength(password: string): PasswordStrength {
  const checks = {
    length: password.length >= 8,
    case: /[a-z]/.test(password) && /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
  const score = Object.values(checks).filter(Boolean).length;
  return { score, label: STRENGTH_LABELS[score], checks };
}
