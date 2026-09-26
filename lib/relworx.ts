const BASE = (process.env.RELWORX_API_BASE_URL || "https://payments.relworx.com/api").replace(/\/$/, "");
function apiKey() { const v = process.env.RELWORX_API_KEY; if (!v) throw new Error("RELWORX_API_KEY is not configured"); return v; }
function accountNo() { const v = process.env.RELWORX_ACCOUNT_NO; if (!v) throw new Error("RELWORX_ACCOUNT_NO is not configured"); return v; }
async function relworxFetch(path: string, init: RequestInit) {
  const response = await fetch(BASE + path, {
    ...init,
    headers: {
      Accept: "application/vnd.relworx.v2",
      "Content-Type": "application/json",
      Authorization: "Bearer " + apiKey(),
      ...(init.headers || {}),
    },
    cache: "no-store",
  });
  const text = await response.text();
  let body: unknown = {};
  try { body = text ? JSON.parse(text) : {}; } catch { body = { raw: text }; }
  if (!response.ok) {
    const message = typeof body === "object" && body !== null && "message" in body
      ? String((body as {message?: unknown}).message || "Relworx request failed")
      : "Relworx request failed";
    throw new Error(message);
  }
  return body as Record<string, unknown>;
}
export function validateMobileNumber(msisdn: string) {
  return relworxFetch("/mobile-money/validate", { method:"POST", body:JSON.stringify({msisdn}) });
}
export function requestPayment(input:{reference:string;msisdn:string;amount:number;description:string}) {
  return relworxFetch("/mobile-money/request-payment", { method:"POST", body:JSON.stringify({
    account_no:accountNo(), reference:input.reference, msisdn:input.msisdn, currency:"UGX", amount:input.amount, description:input.description
  })});
}
export function checkRequestStatus(internalReference:string) {
  const q = new URLSearchParams({ internal_reference:internalReference, account_no:accountNo() });
  return relworxFetch("/mobile-money/check-request-status?" + q.toString(), { method:"GET" });
}
