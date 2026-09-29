const DEFAULT_SANDBOX_URL =
  "https://sandbox.yo.co.ug/services/yopaymentsdev/task.php";
const DEFAULT_PRODUCTION_URL =
  "https://paymentsapi1.yo.co.ug/ybs/task.php";

export function yoEnvironment() {
  return process.env.YO_ENVIRONMENT === "production" ? "production" : "sandbox";
}

function apiUrl() {
  const configured = process.env.YO_API_BASE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");

  return yoEnvironment() === "production"
    ? DEFAULT_PRODUCTION_URL
    : DEFAULT_SANDBOX_URL;
}

function credentials() {
  const username = process.env.YO_API_USERNAME?.trim();
  const password = process.env.YO_API_PASSWORD;

  if (!username || !password) {
    throw new Error(
      "Yo! Payments is not configured. Set YO_API_USERNAME and YO_API_PASSWORD.",
    );
  }

  return { username, password };
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function decodeXml(value: string) {
  return value
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&amp;", "&");
}

function xmlValue(xml: string, tag: string) {
  const match = xml.match(
    new RegExp("<" + tag + ">[\\s\\S]*?<\\/" + tag + ">", "i"),
  );

  if (!match) return "";

  return decodeXml(
    match[0]
      .replace(new RegExp("^<" + tag + ">", "i"), "")
      .replace(new RegExp("<\\/" + tag + ">$", "i"), "")
      .trim(),
  );
}

function parseResponse(xml: string) {
  return {
    Status: xmlValue(xml, "Status"),
    StatusCode: xmlValue(xml, "StatusCode"),
    StatusMessage: xmlValue(xml, "StatusMessage"),
    TransactionStatus: xmlValue(xml, "TransactionStatus"),
    ErrorMessageCode: xmlValue(xml, "ErrorMessageCode"),
    ErrorMessage: xmlValue(xml, "ErrorMessage"),
    TransactionReference: xmlValue(xml, "TransactionReference"),
    MNOTransactionReferenceId: xmlValue(xml, "MNOTransactionReferenceId"),
    Amount: xmlValue(xml, "Amount"),
    AmountFormatted: xmlValue(xml, "AmountFormatted"),
    CurrencyCode: xmlValue(xml, "CurrencyCode"),
    TransactionInitiationDate: xmlValue(xml, "TransactionInitiationDate"),
    TransactionCompletionDate: xmlValue(xml, "TransactionCompletionDate"),
    IssuedReceiptNumber: xmlValue(xml, "IssuedReceiptNumber"),
  };
}

async function yoFetch(xml: string) {
  const response = await fetch(apiUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      Accept: "application/xml, text/xml",
    },
    body: xml,
    cache: "no-store",
  });

  const body = await response.text();

  if (!response.ok) {
    throw new Error(
      "Yo! Payments request failed with HTTP " + response.status + ".",
    );
  }

  if (!body.trim()) {
    throw new Error("Yo! Payments returned an empty response.");
  }

  return parseResponse(body);
}

function buildRequest(fields: string) {
  const { username, password } = credentials();

  return (
    '<?xml version="1.0" encoding="UTF-8"?>' +
    "<AutoCreate><Request>" +
    "<APIUsername>" +
    escapeXml(username) +
    "</APIUsername>" +
    "<APIPassword>" +
    escapeXml(password) +
    "</APIPassword>" +
    fields +
    "</Request></AutoCreate>"
  );
}

export async function requestPayment(input: {
  externalReference: string;
  msisdn: string;
  amount: number;
  narrative: string;
}) {
  const fields =
    "<Method>acdepositfunds</Method>" +
    "<NonBlocking>TRUE</NonBlocking>" +
    "<Account>" +
    escapeXml(input.msisdn.replace(/^\+/, "")) +
    "</Account>" +
    "<Amount>" +
    String(input.amount) +
    "</Amount>" +
    "<Narrative>" +
    escapeXml(input.narrative) +
    "</Narrative>" +
    "<ExternalReference>" +
    escapeXml(input.externalReference) +
    "</ExternalReference>";

  return yoFetch(buildRequest(fields));
}

export async function checkRequestStatus(externalReference: string) {
  const fields =
    "<Method>actransactioncheckstatus</Method>" +
    "<PrivateTransactionReference>" +
    escapeXml(externalReference) +
    "</PrivateTransactionReference>" +
    "<DepositTransactionType>PULL</DepositTransactionType>";

  return yoFetch(buildRequest(fields));
}

export function normalizeYoStatus(value: string) {
  switch (value.toUpperCase()) {
    case "SUCCEEDED":
    case "SUCCESS":
    case "SUCCESSFUL":
    case "COMPLETED":
    case "COMPLETE":
      return "success";
    case "FAILED":
    case "FAILURE":
    case "CANCELLED":
    case "CANCELED":
    case "EXPIRED":
      return "failed";
    default:
      return "pending";
  }
}
