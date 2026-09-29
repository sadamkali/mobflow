import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json(
    {
      received: false,
      message: "Yo! Payments instant notifications are not enabled in the current sandbox integration.",
    },
    { status: 503 },
  );
}
