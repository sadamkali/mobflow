"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PACKAGES, type PackageId } from "@/lib/packages";

export type PortalSession = {
  internalReference: string;
  packageId: PackageId;
  label: string;
  durationLabel: string;
  amount: number;
  phone: string;
  confirmedAt: number;
  expiresAt: number;
};

type PaymentState = "idle" | "validating" | "starting" | "pending" | "success" | "failed";

type PaymentModalProps = {
  open: boolean;
  initialPackageId: PackageId;
  onClose: () => void;
  onSuccess: (session: PortalSession) => void;
};

const money = new Intl.NumberFormat("en-UG");

function maskPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 7) return value;
  return digits.slice(0, 4) + "****" + digits.slice(-3);
}

export default function PaymentModal({
  open,
  initialPackageId,
  onClose,
  onSuccess,
}: PaymentModalProps) {
  const [packageId, setPackageId] = useState<PackageId>(initialPackageId);
  const [msisdn, setMsisdn] = useState("");
  const [state, setState] = useState<PaymentState>("idle");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [internalReference, setInternalReference] = useState("");
  const phoneRef = useRef<HTMLInputElement>(null);

  const selected = useMemo(
    () => PACKAGES.find((pkg) => pkg.id === packageId) ?? PACKAGES[4],
    [packageId],
  );

  const processing =
    state === "validating" || state === "starting" || state === "pending";

  useEffect(() => {
    if (!open) return;

    setPackageId(initialPackageId);
    setState("idle");
    setError("");
    setMessage("");
    setInternalReference("");

    const focusTimer = window.setTimeout(() => phoneRef.current?.focus(), 100);
    return () => window.clearTimeout(focusTimer);
  }, [open, initialPackageId]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !processing) onClose();
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, processing, onClose]);

  useEffect(() => {
    if (state !== "pending" || !internalReference) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;

    const poll = async () => {
      attempts += 1;

      try {
        const response = await fetch(
          "/api/payments/status?internalReference=" +
            encodeURIComponent(internalReference),
          { cache: "no-store" },
        );
        const data = await response.json();

        if (cancelled) return;

        if (data.status === "success") {
          setState("success");
          setMessage(data.message || "Payment confirmed successfully.");
          return;
        }

        if (
          data.status === "failed" ||
          data.status === "cancelled" ||
          data.status === "expired"
        ) {
          setState("failed");
          setError(data.message || "The payment was not completed.");
          return;
        }
      } catch {
        // Continue polling when a single status request fails.
      }

      if (attempts >= 24) {
        setState("failed");
        setError(
          "The payment is taking longer than expected. Check your phone and try again.",
        );
        return;
      }

      timer = setTimeout(poll, 5000);
    };

    poll();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [state, internalReference]);

  async function submit() {
    setError("");
    setMessage("");

    if (!msisdn.trim()) {
      setError("Enter the MTN or Airtel number you will pay from.");
      phoneRef.current?.focus();
      return;
    }

    try {
      setState("validating");

      const validationResponse = await fetch("/api/payments/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ msisdn }),
      });
      const validationData = await validationResponse.json();

      if (!validationResponse.ok || !validationData.valid) {
        throw new Error(
          validationData.message ||
            "That mobile-money number could not be validated.",
        );
      }

      setState("starting");

      const initiateResponse = await fetch("/api/payments/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId: selected.id, msisdn }),
      });
      const initiateData = await initiateResponse.json();

      if (!initiateResponse.ok) {
        throw new Error(
          initiateData.message || "Unable to start the payment.",
        );
      }

      setInternalReference(initiateData.internalReference);
      setMessage("Payment request sent. Approve it on your phone.");
      setState("pending");
    } catch (err) {
      setState("failed");
      setError(
        err instanceof Error ? err.message : "Unable to start payment.",
      );
    }
  }

  function continueToSession() {
    if (state !== "success" || !internalReference) return;

    const confirmedAt = Date.now();
    onSuccess({
      internalReference,
      packageId: selected.id,
      label: selected.label,
      durationLabel: selected.durationLabel,
      amount: selected.amount,
      phone: maskPhone(msisdn),
      confirmedAt,
      expiresAt: confirmedAt + selected.durationSeconds * 1000,
    });
  }

  function closeModal() {
    if (processing) return;
    onClose();
  }

  if (!open) return null;

  return (
    <div className="payment-modal-backdrop" onMouseDown={closeModal}>
      <div
        className="payment-modal glass"
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        {state === "success" ? (
          <div className="payment-success-state">
            <div className="payment-success-icon" aria-hidden="true">
              <span />
            </div>
            <span className="payment-processing-label">Payment confirmed</span>
            <h2 id="payment-modal-title">You&apos;re ready to connect</h2>
            <p>
              Your {selected.durationLabel.toLowerCase()} bundle is active from
              this payment.
            </p>

            <div className="modal-package">
              <div>
                <span>Internet bundle</span>
                <strong>{selected.durationLabel}</strong>
              </div>
              <b>UGX {money.format(selected.amount)}</b>
            </div>

            <button className="btn primary modal-pay-btn" type="button" onClick={continueToSession}>
              Continue
            </button>
          </div>
        ) : (
          <>
            <div className="payment-modal-top">
              <div>
                <span className="kicker">Internet access</span>
                <h2 id="payment-modal-title">Get connected</h2>
                <p>Choose your bundle, enter your mobile-money number, and approve the payment on your phone.</p>
              </div>
              <button
                className="modal-close"
                type="button"
                onClick={closeModal}
                disabled={processing}
                aria-label="Close payment window"
              >
                ×
              </button>
            </div>

            <div className="modal-package">
              <div>
                <span>Selected bundle</span>
                <strong>{selected.durationLabel}</strong>
              </div>
              <b>UGX {money.format(selected.amount)}</b>
            </div>

            {state === "failed" && (
              <div className="error" role="alert">
                {error}
              </div>
            )}

            <div className="field full">
              <label htmlFor="modal-package">Internet bundle</label>
              <select
                id="modal-package"
                value={packageId}
                onChange={(event) => setPackageId(event.target.value as PackageId)}
              >
                {PACKAGES.map((pkg) => (
                  <option key={pkg.id} value={pkg.id} style={{ color: "#0f172a" }}>
                    {pkg.durationLabel} — UGX {money.format(pkg.amount)}
                  </option>
                ))}
              </select>
            </div>

            <div className="field full modal-phone-field">
              <label htmlFor="modal-msisdn">MTN or Airtel number</label>
              <input
                ref={phoneRef}
                id="modal-msisdn"
                value={msisdn}
                onChange={(event) => setMsisdn(event.target.value)}
                placeholder="07XX XXX XXX"
                inputMode="tel"
                autoComplete="tel"
              />
              <span className="field-hint">A payment prompt will appear on this number.</span>
            </div>

            <div className="summary modal-summary">
              <div className="summary-row">
                <span>Access time</span>
                <strong>{selected.durationLabel}</strong>
              </div>
              <div className="summary-row">
                <span>Payment</span>
                <strong>MTN / Airtel Mobile Money</strong>
              </div>
              <div className="summary-row">
                <span>Total</span>
                <strong>UGX {money.format(selected.amount)}</strong>
              </div>
            </div>

            <button className="btn primary modal-pay-btn" type="button" onClick={submit}>
              Pay UGX {money.format(selected.amount)}
            </button>

            <p className="mini-note modal-note">
              Approve the payment request on your phone. Do not close this window while we confirm it.
            </p>
          </>
        )}

        {processing && (
          <div className="payment-processing-layer" aria-live="polite">
            <div className="payment-processing">
              <div className="payment-spinner" aria-hidden="true" />
              <span className="payment-processing-label">
                {state === "validating"
                  ? "Checking your number"
                  : state === "starting"
                    ? "Sending payment request"
                    : "Checking payment"}
              </span>
              <h3>
                {state === "pending"
                  ? "Waiting for your approval"
                  : state === "starting"
                    ? "Opening your mobile-money prompt"
                    : "Please wait a moment"}
              </h3>
              <p>
                {state === "pending"
                  ? "Approve the request on your phone. We&apos;ll keep checking the payment in the background."
                  : "Your payment is being checked securely. Please keep this window open."}
              </p>
              {state === "pending" && (
                <>
                  <span className="processing-amount">
                    UGX {money.format(selected.amount)}
                  </span>
                  <span className="processing-note">This can take a few seconds.</span>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
