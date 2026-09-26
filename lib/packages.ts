export const PACKAGES = [
  { id: "starter-1000", amount: 1000, label: "Starter", note: "A small first payment." },
  { id: "starter-2000", amount: 2000, label: "Basic", note: "Simple and affordable." },
  { id: "starter-3000", amount: 3000, label: "Standard", note: "A balanced option." },
  { id: "starter-4000", amount: 4000, label: "Plus", note: "More room for your order." },
  { id: "starter-5000", amount: 5000, label: "Pro", note: "A popular package size." },
  { id: "starter-10000", amount: 10000, label: "Premium", note: "For larger purchases." },
] as const;
export type PackageId = typeof PACKAGES[number]["id"];
export function getPackage(id: string) { return PACKAGES.find((item) => item.id === id); }
