import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getPackage } from "@/lib/packages";
import { normalizeUgandaMsisdn } from "@/lib/phone";
import { requestPayment, yoEnvironment } from "@/lib/yo";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const packageId = String(body?.packageId ?? "");
    const msisdn = normalizeUgandaMsisdn(String(body?.msisdn ?? ""));
    const pkg = getPackage(packageId);

    if (!pkg) {
      return NextResponse.json({ message: "Choose a valid package." }, { status: 400 });
    }

    if (!msisdn) {
      return NextResponse.json(
        { message: "Enter a valid Ugandan mobile-money number." },
        { status: 400 },
      );
    }

    const reference = "MF_" + randomUUID().replace(/-/g, "").slice(0, 28);

    const result = await requestPayment({
      externalReference: reference,
      msisdn,
      amount: pkg.amount,
      narrative: "MobiFlow " + pkg.durationLabel + " Wi-Fi access",
    });

    const providerMessage =
      result.ErrorMessage ||
      result.StatusMessage ||
      "Yo! Payments rejected the payment request.";

    const isIndeterminate =
      /indeterminate/i.test(providerMessage) ||
      /indeterminate/i.test(result.TransactionStatus || "");

    if (isIndeterminate) {
      // Yo! can return an INDETERMINATE response when the gateway cannot
      // immediately determine whether the request reached the mobile-money
      // network. Keep the same external reference and let the status endpoint
      // resolve it rather than telling the customer to submit another request.
      return NextResponse.json({
        ok: true,
        reference,
        internalReference: reference,
        transactionReference: result.TransactionReference || null,
        amount: pkg.amount,
        msisdn,
        status: "pending",
        providerStatus: result.TransactionStatus || null,
        message:
          "Yo! is still resolving this payment request. We will keep checking its status.",
        environment: yoEnvironment(),
      });
    }

    if (result.Status !== "OK" || !result.TransactionReference) {
      return NextResponse.json({ message: providerMessage }, { status: 502 });
    }

    return NextResponse.json({
      ok: true,
      reference,
      internalReference: reference,
      transactionReference: result.TransactionReference,
      amount: pkg.amount,
      msisdn,
      status: "pending",
      providerStatus: result.TransactionStatus || null,
      environment: yoEnvironment(),
      message: "Payment request sent. Waiting for confirmation.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Unable to start payment.",
      },
      { status: 502 },
    );
  }
}
