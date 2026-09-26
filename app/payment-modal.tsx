"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PACKAGES, type PackageId } from "@/lib/packages";

type PaymentState = "idle" | "validating" | "starting" | "pending" | "success" | "failed";
type PaymentModalProps = {
  open: boolean;
  initialPackageId: PackageId;
  onClose: () => void;
};

const money = new Intl.NumberFormat("en-UG");

export default function PaymentModal({ open, initialPackageId, onClose }: PaymentModalProps) {
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

  const processing = state === "validating" || state === "starting" || state === "pending";

  useEffect(() => {
    if (!open) return;
    setPackageId(initialPackageId);
    setState("idle");
    setError("");
    setMessage("");
    setInternalReference("");
    window.setTimeout(() => phoneRef.current?.focus(), 80);
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

    const poll = async () => {
      try {
        const response = await fetch(
          "/api/payments/status?internalReference=" + encodeURIComponent(internalReference),
          { cache: "no-store" },
        );
        const data = await response.json();

        if (cancelled) return;

        if (data.status === "success") {
          setState("success");
          setMessage(data.message || "Payment completed successfully.");
          return;
        }

        if (data.status === "failed") {
          setState("failed");
          setError(data.message || "Payment failed.");
          return;
        }
      } catch {
        // Keep polling in the background if one status check fails.
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
          validationData.message || "That mobile-money number could not be validated.",
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
        throw new Error(initiateData.message || "Unable to start the payment.");
      }

      setInternalReference(initiateData.internalReference);
      setMessage("Payment request sent. Approve it on your phone.");
      setState("pending");
    } catch (err) {
      setState("failed");
      setError(err instanceof Error ? err.message : "Unable to start payment.");
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
        <div className="payment-modal-top">
          <div>
            <span className="kicker">Secure checkout</span>
            <h2 id="payment-modal-title">Pay with Mobile Money</h2>
            <p>Approve the payment directly from your MTN or Airtel phone.</p>
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

        {state === "idle" || state === "failed" || state === "success" ? (
          <>
            <div className="modal-package">
              <div>
                <span>Selected package</span>
                <strong>{selected.label}</strong>
              </div>
              <b>UGX {money.format(selected.amount)}</b>
            </div>

            {state === "failed" && (
              <div className="error" role="alert">
                {error}
              </div>
            )}

            {state === "success" && (
              <div className="success" role="status">
                {message}
              </div>
            )}

            {state !== "success" && (
              <>
                <div className="field full">
                  <label htmlFor="modal-package">Package</label>
                  <select
                    id="modal-package"
                    value={packageId}
                    onChange={(event) => setPackageId(event.target.value as PackageId)}
                  >
                    {PACKAGES.map((pkg) => (
                      <option key={pkg.id} value={pkg.id} style={{ color: "#0f172a" }}>
                        {pkg.label} — UGX {money.format(pkg.amount)}
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
                    placeholder="07XXXXXXXX"
                    inputMode="tel"
                    autoComplete="tel"
                  />
                </div>

                <div className="summary modal-summary">
                  <div className="summary-row">
                    <span>Amount</span>
                    <strong>UGX {money.format(selected.amount)}</strong>
                  </div>
                  <div className="summary-row">
                    <span>Payment</span>
                    <strong>MTN / Airtel Mobile Money</strong>
                  </div>
                </div>

                <button className="btn primary modal-pay-btn" type="button" onClick={submit}>
                  Pay UGX {money.format(selected.amount)}
                </button>

                <p className="mini-note modal-note">
                  Your payment credentials stay on the server. This window only handles the
                  checkout.
                </p>
              </>
            )}

            {state === "success" && (
              <button className="btn primary modal-pay-btn" type="button" onClick={onClose}>
                Done
              </button>
            )}
          </>
        ) : (
          <div className="payment-processing" aria-live="polite">
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
                ? "Approve the request on your phone. We are checking the payment in the background."
                : "Your payment is being checked securely. Please keep this window open."}
            </p>
            {state === "pending" && <span className="processing-amount">UGX {money.format(selected.amount)}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
