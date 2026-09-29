import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";
import { getPackage, PACKAGES } from "@/lib/packages";
import { checkRequestStatus, normalizeYoStatus } from "@/lib/yo";

export const runtime = "nodejs";

const COOKIE_NAME = "mobflow_portal_session";

type SessionPayload = {
  internalReference: string;
  packageId: string;
  confirmedAt: number;
  expiresAt: number;
  msisdn?: string;
};

function sessionSecret() {
  const secret = process.env.PORTAL_SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "PORTAL_SESSION_SECRET is not configured. Set it in the server environment.",
    );
  }
  return secret;
}

function encode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(value: string) {
  return createHmac("sha256", sessionSecret()).update(value, "utf8").digest("base64url");
}

function createToken(payload: SessionPayload) {
  const body = encode(JSON.stringify(payload));
  return body + "." + sign(body);
}

function verifyToken(token: string): SessionPayload | null {
  const [body, providedSignature] = token.split(".");
  if (!body || !providedSignature) return null;

  const expectedSignature = sign(body);
  const provided = Buffer.from(providedSignature, "utf8");
  const expected = Buffer.from(expectedSignature, "utf8");

  if (provided.length !== expected.length) return null;
  if (!timingSafeEqual(provided, expected)) return null;

  try {
    const payload = JSON.parse(decode(body)) as SessionPayload;
    if (
      !payload.internalReference ||
      !payload.packageId ||
      !Number.isFinite(payload.confirmedAt) ||
      !Number.isFinite(payload.expiresAt)
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

function completedTimestamp(result: Record<string, unknown>) {
  const value = result.TransactionCompletionDate;
  if (!value) return Date.now();

  const timestamp = new Date(String(value)).getTime();
  return Number.isFinite(timestamp) ? timestamp : Date.now();
}

function publicSession(payload: SessionPayload) {
  const pkg = getPackage(payload.packageId);
  if (!pkg) return null;

  return {
    internalReference: payload.internalReference,
    packageId: pkg.id,
    label: pkg.label,
    durationLabel: pkg.durationLabel,
    amount: pkg.amount,
    phone:
      payload.msisdn && payload.msisdn.length >= 7
        ? payload.msisdn.slice(0, 4) + "****" + payload.msisdn.slice(-3)
        : "Mobile Money",
    confirmedAt: payload.confirmedAt,
    expiresAt: payload.expiresAt,
  };
}

async function verifyPayment(internalReference: string, msisdn?: string) {
  const result = await checkRequestStatus(internalReference);
  const status = normalizeYoStatus(result.TransactionStatus);

  if (status !== "success") {
    return null;
  }

  const amount = Number(result.Amount);
  if (!Number.isFinite(amount)) return null;

  const pkg = PACKAGES.find((item) => item.amount === amount);
  if (!pkg) return null;

  const confirmedAt = completedTimestamp(result);
  const expiresAt = confirmedAt + pkg.durationSeconds * 1000;

  if (expiresAt <= Date.now()) return null;

  return {
    payload: {
      internalReference,
      packageId: pkg.id,
      confirmedAt,
      expiresAt,
      msisdn,
    } satisfies SessionPayload,
    msisdn,
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const internalReference = String(body?.internalReference ?? "").trim();
    const msisdn = String(body?.msisdn ?? "").trim();

    if (!internalReference) {
      return NextResponse.json(
        { active: false, message: "Payment reference is required." },
        { status: 400 },
      );
    }

    const verified = await verifyPayment(internalReference, msisdn || undefined);
    if (!verified) {
      return NextResponse.json(
        { active: false, message: "Payment could not be confirmed for a portal session." },
        { status: 409 },
      );
    }

    const token = createToken(verified.payload);
    const maxAge = Math.max(
      1,
      Math.ceil((verified.payload.expiresAt - Date.now()) / 1000),
    );

    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge,
    });

    const session = publicSession(verified.payload);

    return NextResponse.json({ active: true, session });
  } catch (error) {
    return NextResponse.json(
      {
        active: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to create the portal session.",
      },
      { status: 502 },
    );
  }
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ active: false });
    }

    const payload = verifyToken(token);
    if (!payload || payload.expiresAt <= Date.now()) {
      cookieStore.delete(COOKIE_NAME);
      return NextResponse.json({ active: false });
    }

    const pkg = getPackage(payload.packageId);
    if (!pkg || payload.expiresAt <= Date.now()) {
      cookieStore.delete(COOKIE_NAME);
      return NextResponse.json({ active: false });
    }

    const result = await checkRequestStatus(payload.internalReference);
    const status = normalizeYoStatus(result.TransactionStatus);
    const amount = Number(result.Amount);

    if (status !== "success" || !Number.isFinite(amount) || amount !== pkg.amount) {
      cookieStore.delete(COOKIE_NAME);
      return NextResponse.json({ active: false });
    }

    const session = publicSession(payload);
    return NextResponse.json({ active: true, session });
  } catch (error) {
    return NextResponse.json(
      {
        active: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to check the portal session.",
      },
      { status: 502 },
    );
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  return NextResponse.json({ active: false });
}
