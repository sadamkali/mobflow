export function normalizeUgandaMsisdn(input: string): string | null {
  const raw = input.trim().replace(/[\s()-]/g, "");
  if (!raw) return null;
  if (raw.startsWith("+256")) {
    const digits = raw.slice(1).replace(/\D/g, "");
    return /^2567\d{8}$/.test(digits) ? "+" + digits : null;
  }
  const digits = raw.replace(/\D/g, "");
  if (/^07\d{8}$/.test(digits)) return "+256" + digits.slice(1);
  if (/^7\d{8}$/.test(digits)) return "+256" + digits;
  if (/^2567\d{8}$/.test(digits)) return "+" + digits;
  return null;
}
