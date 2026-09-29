import { NextResponse } from "next/server";
import { normalizeUgandaMsisdn } from "@/lib/phone";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const msisdn = normalizeUgandaMsisdn(String(body?.msisdn ?? ""));

    if (!msisdn) {
      return NextResponse.json(
        {
          valid: false,
          message: "Enter a valid Ugandan MTN or Airtel number.",
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      valid: true,
      msisdn,
      customerName: null,
      message: "Number format looks valid.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        valid: false,
        message:
          error instanceof Error ? error.message : "Unable to validate number.",
      },
      { status: 502 },
    );
  }
}
