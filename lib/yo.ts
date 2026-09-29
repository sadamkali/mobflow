import { verify } from "node:crypto";

const DEFAULT_SANDBOX_URL =
  "https://sandbox.yo.co.ug/services/yopaymentsdev/task.php";
const DEFAULT_PRODUCTION_URL =
  "https://paymentsapi1.yo.co.ug/ybs/task.php";

const DEFAULT_SANDBOX_CERTIFICATE = [
  "-----BEGIN CERTIFICATE-----",
  "MIIGJTCCBA2gAwIBAgIJALqNKn338j3LMA0GCSqGSIb3DQEBCwUAMIGoMQswCQYD",
  "VQQGEwJVRzEPMA0GA1UECAwGVWdhbmRhMRAwDgYDVQQHDAdLYW1wYWxhMRowGAYD",
  "VQQKDBFZbyBVZ2FuZGEgTGltaXRlZDEeMBwGA1UECwwVWW8hIFBheW1lbnRzIFNl",
  "Y3VyaXR5MRkwFwYDVQQDDBBzYW5kYm94LnlvLmNvLnVnMR8wHQYJKoZIhvcNAQkB",
  "FhBzdXBwb3J0QHlvLmNvLnVnMB4XDTIzMTExMDA5Mjg0NFoXDTQzMTEwNTA5Mjg0",
  "NFowgagxCzAJBgNVBAYTAlVHMQ8wDQYDVQQIDAZVZ2FuZGExEDAOBgNVBAcMB0th",
  "bXBhbGExGjAYBgNVBAoMEVlvIFVnYW5kYSBMaW1pdGVkMR4wHAYDVQQLDBVZbyEg",
  "UGF5bWVudHMgU2VjdXJpdHkxGTAXBgNVBAMMEHNhbmRib3gueW8uY28udWcxHzAd",
  "BgkqhkiG9w0BCQEWEHN1cHBvcnRAeW8uY28udWcwggIiMA0GCSqGSIb3DQEBAQUA",
  "A4ICDwAwggIKAoICAQDX9GqOzAK5CG/K7ndZnr+Zi1kTiQ8BS6sH7NnsQPLv0sVa",
  "CZ5mclhdSaeDe4d+atVT6SMvB5zu1KSGmJ3iX7S0B/ctkQUaw6HuvPWfDqWTHO+G",
  "JehGEJfcEzSbGw/t3/mByJTFOOaUDG4riqXCYX+C/rcF3dZEgMKTzTWWx9sMuZRO",
  "i9Atn8QGrCecTILn/VGQHw94P/FU6CjEwnOCPbx6ErWkNUSDx9e/e8pSzPn2sWYE",
  "gBE+joy0itpehIfnUig0G57zsfqE5GC8yNKP47NIsdeR83I3mCjxjKVQ2F/kLBXM",
  "i/TALadUI36dmvtVkaJEAyCA5tdUOkuUuPaang1hoUBRO0Iz14y+hoSqe37JlhPN",
  "3jtxmOXJ5j0neSlQeGhBc",
  "pC1nt8GEdEqO7KLQFzuqvez+NXdnjk82RC/CzOSCL9bYo2b0vVGLEtb1oufm3xZ",
  "n4+nx+VCkPM5++rXGiUjr4lhyRDzrlVEdOD9hW/V5rkM2vgqGOGaJPOem5Dcvgfx",
  "kG4vwmPAzEYYaVbq8F2H4uirIzmDYlnmrX6ir/DESaVynjyQzMo6bcaey3ukFRM/",
  "3fLASrGyxOm0ffGoiT1Y4Rus68EV4wBLcSe9v/npWxlf7nMhdiAwn4sRr00yciuu",
  "VHxWRkVTpePhScSglaj9fcjnMb0OiaeX4TXOAw/UWpW/jDpo4WFZfgI=",
  "-----END CERTIFICATE-----",
].join("\n");

function apiUrl() {
  const configured = process.env.YO_API_BASE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");

  return process.env.YO_ENVIRONMENT === "production"
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
  const notificationUrl = process.env.YO_INSTANT_NOTIFICATION_URL?.trim();
  const failureNotificationUrl =
    process.env.YO_FAILURE_NOTIFICATION_URL?.trim();

  const fields =
    "<Method>acdepositfunds</Method>" +
    "<NonBlocking>TRUE</NonBlocking>" +
    "<Account>" +
    escapeXml(input.msisdn) +
    "</Account>" +
    "<Amount>" +
    String(input.amount) +
    "</Amount>" +
    "<Narrative>" +
    escapeXml(input.narrative) +
    "</Narrative>" +
    "<ExternalReference>" +
    escapeXml(input.externalReference) +
    "</ExternalReference>" +
    (notificationUrl
      ? "<InstantNotificationUrl>" +
        escapeXml(notificationUrl) +
        "</InstantNotificationUrl>"
      : "") +
    (failureNotificationUrl
      ? "<FailureNotificationUrl>" +
        escapeXml(failureNotificationUrl) +
        "</FailureNotificationUrl>"
      : "");

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

export function yoPublicCertificate() {
  return process.env.YO_PUBLIC_CERTIFICATE?.trim() || DEFAULT_SANDBOX_CERTIFICATE;
}

export function verifyYoSuccessNotification(input: {
  dateTime: string;
  amount: string;
  narrative: string;
  networkReference: string;
  externalReference: string;
  msisdn: string;
  verification: string;
}) {
  const data =
    input.dateTime +
    input.amount +
    input.narrative +
    input.networkReference +
    input.externalReference +
    input.msisdn;

  return verify(
    "RSA-SHA1",
    Buffer.from(data, "utf8"),
    yoPublicCertificate(),
    Buffer.from(input.verification, "base64"),
  );
}

export function verifyYoFailureNotification(input: {
  failedTransactionReference: string;
  transactionInitDate: string;
  verification: string;
}) {
  const data =
    input.failedTransactionReference + input.transactionInitDate;

  return verify(
    "RSA-SHA1",
    Buffer.from(data, "utf8"),
    yoPublicCertificate(),
    Buffer.from(input.verification, "base64"),
  );
}
