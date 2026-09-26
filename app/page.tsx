"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import PaymentModal, { type PortalSession } from "@/app/payment-modal";
import { PACKAGES, type PackageId } from "@/lib/packages";

const money = new Intl.NumberFormat("en-UG");

function formatRemaining(expiresAt: number) {
  const totalSeconds = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return (
      days +
      "d " +
      String(hours).padStart(2, "0") +
      "h " +
      String(minutes).padStart(2, "0") +
      "m " +
      String(seconds).padStart(2, "0") +
      "s"
    );
  }

  return (
    String(hours).padStart(2, "0") +
    ":" +
    String(minutes).padStart(2, "0") +
    ":" +
    String(seconds).padStart(2, "0")
  );
}

export default function Home() {
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<PackageId>(PACKAGES[4].id);
  const [activeSession, setActiveSession] = useState<PortalSession | null>(null);
  const [showSession, setShowSession] = useState(false);
  const [remaining, setRemaining] = useState("");
  const [checkingSession, setCheckingSession] = useState(true);
  const [expiredNotice, setExpiredNotice] = useState(false);

  const refreshSession = useCallback(async (showLoading = false) => {
    if (showLoading) setCheckingSession(true);

    try {
      const response = await fetch("/api/portal/session", {
        cache: "no-store",
        credentials: "include",
      });
      const data = await response.json();

      if (data.active && data.session) {
        setActiveSession(data.session);
        setRemaining(formatRemaining(data.session.expiresAt));
        return true;
      }

      setActiveSession(null);
      setShowSession(false);
      return false;
    } catch {
      return false;
    } finally {
      if (showLoading) setCheckingSession(false);
    }
  }, []);

  useEffect(() => {
    void refreshSession(true);
  }, [refreshSession]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void refreshSession(false);
      }
    };

    window.addEventListener("focus", handleVisibility);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("focus", handleVisibility);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [refreshSession]);

  useEffect(() => {
    if (!activeSession) {
      setRemaining("");
      return;
    }

    const tick = () => {
      const next = formatRemaining(activeSession.expiresAt);
      setRemaining(next);

      if (activeSession.expiresAt <= Date.now()) {
        setActiveSession(null);
        setShowSession(false);
        setExpiredNotice(true);
        void fetch("/api/portal/session", { method: "DELETE" }).catch(() => undefined);
      }
    };

    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [activeSession]);

  const openPayment = useCallback((packageId: PackageId) => {
    setSelectedPackage(packageId);
    setExpiredNotice(false);
    setPaymentOpen(true);
  }, []);

  const handlePaymentSuccess = useCallback((session: PortalSession) => {
    setActiveSession(session);
    setRemaining(formatRemaining(session.expiresAt));
    setShowSession(true);
    setExpiredNotice(false);
    setPaymentOpen(false);

    window.setTimeout(() => {
      document.getElementById("session")?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 60);
  }, []);

  const endPortalSession = useCallback(async () => {
    await fetch("/api/portal/session", { method: "DELETE" }).catch(() => undefined);
    setActiveSession(null);
    setShowSession(false);
  }, []);

  const activePackage = useMemo(
    () =>
      activeSession
        ? PACKAGES.find((pkg) => pkg.id === activeSession.packageId) ?? null
        : null,
    [activeSession],
  );

  return (
    <>
      <div className="portal-page">
        <header className="portal-header">
          <div className="portal-header-inner">
            <div className="portal-brand">
              <div className="portal-logo" aria-hidden="true">
                <span />
              </div>
              <div>
                <strong>
                  Mobi<span>Flow</span>
                </strong>
                <small>Wi-Fi access portal</small>
              </div>
            </div>

            <a className="portal-support" href="tel:+256772911432">
              Support · 0772 911 432
            </a>
          </div>
        </header>

        <main className="portal-main">
          <section className="portal-intro">
            <span className="kicker">Uganda Wi-Fi</span>
            <h1>Get online with MobiFlow.</h1>
            <p>
              Choose an Internet bundle and pay with MTN or Airtel Mobile Money.
              Your payment is confirmed in the same window.
            </p>
          </section>

          {checkingSession && (
            <div className="session-check glass" aria-live="polite">
              <span className="mini-spinner" aria-hidden="true" />
              <span>Checking for an active session…</span>
            </div>
          )}

          {expiredNotice && !activeSession && (
            <div className="session-expired glass" role="status">
              <strong>Your session has ended.</strong>
              <span>Choose another bundle to get back online.</span>
            </div>
          )}

          {activeSession && !showSession && (
            <div className="reconnect-bar glass">
              <div>
                <strong>Previous session found</strong>
                <span>
                  {activeSession.durationLabel} · {remaining} remaining
                </span>
              </div>
              <button
                className="btn primary"
                type="button"
                onClick={() => {
                  void refreshSession(false);
                  setShowSession(true);
                }}
              >
                Reconnect
              </button>
            </div>
          )}

          {activeSession && showSession && (
            <section id="session" className="session-card glass">
              <div className="session-top">
                <div>
                  <span className="kicker">Access session</span>
                  <h2>You&apos;re back online.</h2>
                  <p>Your current portal access session is still active.</p>
                </div>
                <span className="live-status">
                  <i /> Active
                </span>
              </div>

              <div className="session-timer">
                <span>Time remaining</span>
                <strong>{remaining}</strong>
              </div>

              <div className="session-grid">
                <div>
                  <span>Bundle</span>
                  <strong>{activeSession.durationLabel}</strong>
                </div>
                <div>
                  <span>Amount paid</span>
                  <strong>UGX {money.format(activeSession.amount)}</strong>
                </div>
                <div>
                  <span>Mobile Money</span>
                  <strong>{activeSession.phone}</strong>
                </div>
                <div>
                  <span>Status</span>
                  <strong>Active</strong>
                </div>
              </div>

              <div className="session-actions">
                <button className="btn" type="button" onClick={() => setShowSession(false)}>
                  View bundles
                </button>
                {activePackage && (
                  <button
                    className="btn primary"
                    type="button"
                    onClick={() => openPayment(activePackage.id)}
                  >
                    Buy another bundle
                  </button>
                )}
                <button className="session-end-btn" type="button" onClick={endPortalSession}>
                  End portal session
                </button>
              </div>
            </section>
          )}

          <section id="packages" className="bundle-section">
            <div className="section-heading">
              <span className="kicker">Internet bundles</span>
              <h2>Choose your bundle</h2>
              <p>Select how long you want to stay connected.</p>
            </div>

            <div className="portal-packages">
              {PACKAGES.map((pkg) => (
                <button
                  key={pkg.id}
                  className={"portal-package glass " + (pkg.popular ? "popular" : "")}
                  type="button"
                  onClick={() => openPayment(pkg.id)}
                >
                  {pkg.popular && <span className="bundle-badge">Popular</span>}
                  <span className="bundle-duration">{pkg.durationLabel}</span>
                  <strong>UGX {money.format(pkg.amount)}</strong>
                  <span className="bundle-note">{pkg.note}</span>
                  <span className="bundle-action">Choose bundle</span>
                </button>
              ))}
            </div>
          </section>

          <section className="portal-help glass">
            <div>
              <span className="kicker">Need help?</span>
              <h2>Having trouble connecting?</h2>
              <p>
                Make sure the number you enter is registered for MTN or Airtel Mobile Money.
              </p>
            </div>
            <a className="btn primary" href="tel:+256772911432">
              Call 0772 911 432
            </a>
          </section>
        </main>
      </div>

      <PaymentModal
        open={paymentOpen}
        initialPackageId={selectedPackage}
        onClose={() => setPaymentOpen(false)}
        onSuccess={handlePaymentSuccess}
      />
    </>
  );
}
