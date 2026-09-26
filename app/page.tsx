"use client";

import Link from "next/link";
import { useState } from "react";
import PaymentModal from "@/app/payment-modal";
import { PACKAGES, type PackageId } from "@/lib/packages";

const money = new Intl.NumberFormat("en-UG");

export default function Home() {
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<PackageId>(PACKAGES[4].id);

  function openPayment(packageId: PackageId = PACKAGES[4].id) {
    setSelectedPackage(packageId);
    setPaymentOpen(true);
  }

  return (
    <>
      <header className="topbar">
        <div className="shell nav">
          <Link href="/" className="brand">
            Mobi<span>Flow</span>
          </Link>
          <nav className="navlinks">
            <a href="#packages">Packages</a>
            <a href="#how">How it works</a>
            <a href="#support">Support</a>
          </nav>
          <button className="btn primary" type="button" onClick={() => openPayment()}>
            Pay now
          </button>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="shell hero-grid">
            <div>
              <span className="kicker">Uganda mobile money</span>
              <h1>Simple payments. Built for Uganda.</h1>
              <p className="hero-copy">
                Choose a package, enter your MTN or Airtel number, and approve the payment
                directly from your phone. A clean experience with a secure server-side Relworx
                connection.
              </p>
              <div className="actions">
                <a className="btn primary" href="#packages">
                  Choose a package
                </a>
                <a className="btn" href="#packages">
                  View prices
                </a>
              </div>
              <p className="mini-note">
                Payments are requested in UGX through MTN or Airtel Mobile Money.
              </p>
            </div>

            <div className="glass preview">
              <div className="preview-head">
                <span>Payment preview</span>
                <span>UGX</span>
              </div>
              <div className="preview-balance">
                <span style={{ color: "var(--muted)", fontSize: 13 }}>Selected package</span>
                <strong>UGX 5,000</strong>
              </div>
              <div className="preview-list">
                <div className="preview-row">
                  <span>Network</span>
                  <strong>MTN / Airtel</strong>
                </div>
                <div className="preview-row">
                  <span>Payment</span>
                  <strong>Mobile Money</strong>
                </div>
                <div className="preview-row">
                  <span>Status</span>
                  <strong>Awaiting approval</strong>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="packages" className="section">
          <div className="shell">
            <span className="kicker">Packages</span>
            <h2 className="section-title">Pick the amount you need.</h2>
            <p className="section-copy">
              Six simple UGX options. Select one and pay without leaving this page.
            </p>

            <div className="packages">
              {PACKAGES.map((pkg, index) => (
                <article
                  key={pkg.id}
                  className={"glass package " + (index === 4 ? "highlight" : "")}
                >
                  <div>
                    <div className="package-label">{pkg.label}</div>
                    <div className="package-amount">UGX {money.format(pkg.amount)}</div>
                    <p>{pkg.note}</p>
                  </div>
                  <button
                    className="btn primary"
                    type="button"
                    onClick={() => openPayment(pkg.id)}
                  >
                    Select package
                  </button>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="how" className="section">
          <div className="shell">
            <span className="kicker">How it works</span>
            <h2 className="section-title">Three clear steps.</h2>
            <div className="info-grid">
              <article className="glass info-card">
                <h3>1. Choose</h3>
                <p>
                  Select the UGX package you want and enter the mobile-money number you will pay
                  from.
                </p>
              </article>
              <article className="glass info-card">
                <h3>2. Approve</h3>
                <p>
                  MobiFlow creates the payment request on the server and Relworx sends it to the
                  selected number.
                </p>
              </article>
              <article className="glass info-card">
                <h3>3. Confirm</h3>
                <p>
                  The payment status is checked with Relworx, with webhook confirmation prepared
                  for production.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section id="support" className="section">
          <div className="shell">
            <div className="glass card">
              <span className="kicker">Support</span>
              <h2 className="section-title">Need help with a payment?</h2>
              <p className="section-copy">
                Contact support on <strong style={{ color: "var(--text)" }}>0772 911 432</strong>.
              </p>
              <div className="actions">
                <a className="btn primary" href="tel:+256772911432">
                  Call support
                </a>
                <button className="btn" type="button" onClick={() => openPayment()}>
                  Open payment
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="shell footer-row">
          <span>© {new Date().getFullYear()} MobiFlow Uganda</span>
          <span>MTN + Airtel Mobile Money</span>
        </div>
      </footer>

      <PaymentModal
        open={paymentOpen}
        initialPackageId={selectedPackage}
        onClose={() => setPaymentOpen(false)}
      />
    </>
  );
}
