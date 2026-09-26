export const PACKAGES = [
  { id: "starter-1000", amount: 1000, label: "Starter", durationLabel: "1 Hour", durationSeconds: 60 * 60, note: "Quick access for light browsing." },
  { id: "starter-2000", amount: 2000, label: "Basic", durationLabel: "3 Hours", durationSeconds: 3 * 60 * 60, note: "A few hours of uninterrupted access." },
  { id: "starter-3000", amount: 3000, label: "Standard", durationLabel: "6 Hours", durationSeconds: 6 * 60 * 60, note: "Great for a longer browsing session." },
  { id: "starter-4000", amount: 4000, label: "Plus", durationLabel: "12 Hours", durationSeconds: 12 * 60 * 60, note: "Half a day of Internet access." },
  { id: "starter-5000", amount: 5000, label: "Popular", durationLabel: "1 Day", durationSeconds: 24 * 60 * 60, note: "A full day of access.", popular: true },
  { id: "starter-10000", amount: 10000, label: "Premium", durationLabel: "3 Days", durationSeconds: 3 * 24 * 60 * 60, note: "Multi-day access for heavier use." },
] as const;

export type PackageId = typeof PACKAGES[number]["id"];

export function getPackage(id: string) {
  return PACKAGES.find((item) => item.id === id);
}
