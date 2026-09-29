import { NextResponse } from "next/server";
import { checkRequestStatus, normalizeYoStatus } from "@/lib/yo";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const internalReference = url.searchParams.get("internalReference")?.trim();

    if (!internalReference) {
      return NextResponse.json(
        { message: "internalReference is required." },
        { status: 400 },
      );
    }

    const result = await checkRequestStatus(internalReference);
    const status = normalizeYoStatus(result.TransactionStatus);

    return NextResponse.json({
      success: status === "success",
      status,
      providerStatus: result.TransactionStatus || null,
      message:
        result.ErrorMessage ||
        result.StatusMessage ||
        (status === "success"
          ? "Payment confirmed successfully."
          : status === "failed"
            ? "The payment was not completed."
            : "Waiting for payment confirmation."),
      amount: result.Amount ? Number(result.Amount) : null,
      currency: result.CurrencyCode || null,
      customerReference: result.TransactionReference || internalReference,
      internalReference,
      completedAt: result.TransactionCompletionDate || null,
      receiptNumber: result.IssuedReceiptNumber || null,
      networkReference: result.MNOTransactionReferenceId || null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Unable to check payment status.",
      },
      { status: 502 },
    );
  }
}
