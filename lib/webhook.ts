import { createHmac, timingSafeEqual } from "node:crypto";
function parseHeader(value:string|null) {
  if (!value) return null;
  const map = new Map<string,string>();
  for (const item of value.split(",").map(v => v.trim())) {
    const i=item.indexOf("=");
    if (i < 0) continue;
    map.set(item.slice(0,i), item.slice(i+1));
  }
  const t=map.get("t"), v=map.get("v");
  return t && v ? {timestamp:t, signature:v} : null;
}
export function verifyRelworxWebhookSignature(args:{
  signatureHeader:string|null; webhookUrl:string; webhookKey:string;
  params:{status:string;customer_reference:string;internal_reference:string}; maxAgeSeconds?:number;
}) {
  const parsed=parseHeader(args.signatureHeader);
  if (!parsed) return false;
  const timestamp=Number(parsed.timestamp);
  if (!Number.isFinite(timestamp)) return false;
  if (Math.abs(Date.now()/1000-timestamp) > (args.maxAgeSeconds ?? 300)) return false;
  const sorted=Object.entries(args.params).sort(([a],[b]) => a.localeCompare(b));
  const signed=args.webhookUrl + parsed.timestamp + sorted.map(([k,v]) => k + String(v)).join("");
  const expected=createHmac("sha256", args.webhookKey).update(signed,"utf8").digest("hex");
  const provided=Buffer.from(parsed.signature,"utf8"), calculated=Buffer.from(expected,"utf8");
  if (provided.length !== calculated.length) return false;
  return timingSafeEqual(provided, calculated);
}
