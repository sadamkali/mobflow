import { NextResponse } from "next/server";
import {
  verifyYoFailureNotification,
  verifyYoSuccessNotification,
} from "@/lib/yo";

export const runtime = "nodejs";

function field(form: URLSearchParams, key: string) {
  return form.get(key) ?? "";
}

async function parseForm(request: Request) {
  const contentType = request.headers.get("content-type") || "";
  const raw = await request.text();

  if (contentType.includes("application/x-www-form-urlencoded")) {
    return new URLSearchParams(raw);
  }

  const params = new URLSearchParams();

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    for (const [key, value] of Object.entries(parsed)) {
      params.set(key, String(value ?? ""));
    }
    return params;
  } catch {
    throw new Error("Invalid webhook payload.");
  }
}

export async function POST(request: Request) {
  try {
    const form = await parseForm(request);
    const verification = field(form, "verification");

    if (!verification) {
      return NextResponse.json(
        { message: "Webhook verification is missing." },
        { status: 401 },
      );
    }

    const externalReference = field(form, "external_ref");

    const successVerified =
      !!externalReference &&
      field(form, "date_time") !== "" &&
      field(form, "amount") !== "" &&
      field(form, "narrative") !== "" &&
      field(form, "network_ref") !== "" &&
      field(form, "msisdn") !== "" &&
      verifyYoSuccessNotification({
        dateTime: field(form, "date_time"),
        amount: field(form, "amount"),
        narrative: field(form, "narrative"),
        networkReference: field(form, "network_ref"),
        externalReference,
        msisdn: field(form, "msisdn"),
        verification,
      });

    const failureReference = field(form, "failed_transaction_reference");

    const failureVerified =
      !successVerified &&
      !!failureReference &&
      field(form, "transaction_init_date") !== "" &&
      verifyYoFailureNotification({
        failedTransactionReference: failureReference,
        transactionInitDate: field(form, "transaction_init_date"),
        verification,
      });

    if (!successVerified && !failureVerified) {
      return NextResponse.json(
        { message: "Invalid Yo! Payments webhook signature." },
        { status: 401 },
      );
    }

    console.log("Verified Yo! Payments webhook", {
      type: successVerified ? "success" : "failure",
      externalReference: successVerified ? externalReference : failureReference,
      amount: field(form, "amount") || null,
      msisdn: field(form, "msisdn") || null,
      networkReference: field(form, "network_ref") || null,
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Unable to process webhook.",
      },
      { status: 400 },
    );
  }
}
