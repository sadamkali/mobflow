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

type PaymentState = "idle" | "validating" | "starting" | "pending" | "activating" | "success" | "failed";

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
    state === "validating" || state === "starting" || state === "pending" || state === "activating";

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

  async function continueToSession() {
    if (state !== "success" || !internalReference) return;

    try {
      setState("activating");
      const response = await fetch("/api/portal/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ internalReference }),
      });
      const data = await response.json();

      if (!response.ok || !data.active || !data.session) {
        throw new Error(
          data.message || "Payment is confirmed, but the portal session could not be created.",
        );
      }

      onSuccess(data.session);
    } catch (err) {
      setState("failed");
      setError(
        err instanceof Error
          ? err.message
          : "Unable to activate the portal session.",
      );
    }
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
              Payment is confirmed. Your {selected.durationLabel.toLowerCase()} access session
              is ready.
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
                <h2 id="payment-modal-title">Complete Payment</h2>
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

            <div className="modal-details">
              <div className="modal-detail-row">
                <span>Plan:</span>
                <strong>{selected.durationLabel}</strong>
              </div>
              <div className="modal-detail-row">
                <span>Amount:</span>
                <strong>UGX {money.format(selected.amount)}</strong>
              </div>
            </div>

            {state === "failed" && (
              <div className="error" role="alert">
                {error}
              </div>
            )}

            <div className="field full modal-phone-field">
              <label htmlFor="modal-msisdn">Phone Number (Mobile Money)</label>
              <input
                ref={phoneRef}
                id="modal-msisdn"
                value={msisdn}
                onChange={(event) => setMsisdn(event.target.value)}
                placeholder="0751000000"
                inputMode="tel"
                autoComplete="tel"
              />
              <span className="field-hint">Enter the number you will pay from.</span>
            </div>

            <button className="btn primary modal-pay-btn" type="button" onClick={submit}>
              Pay Now
            </button>
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
                    : state === "activating"
                      ? "Activating your access"
                      : "Checking payment"}
              </span>
              <h3>
                {state === "pending"
                  ? "Waiting for your approval"
                  : state === "starting"
                    ? "Opening your mobile-money prompt"
                    : state === "activating"
                      ? "Saving your portal session"
                      : "Please wait a moment"}
              </h3>
              <p>
                {state === "pending"
                  ? "Approve the request on your phone. We&apos;ll keep checking the payment in the background."
                  : state === "activating"
                    ? "Your payment is confirmed. We&apos;re preparing your session so you can return to the portal later."
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
