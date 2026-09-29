import Link from "next/link";

const configs = [
  ["YO_API_BASE_URL", process.env.YO_API_BASE_URL, "Yo! Payments API endpoint"],
  ["YO_API_USERNAME", process.env.YO_API_USERNAME, "Server-only Yo! API username"],
  ["YO_API_PASSWORD", process.env.YO_API_PASSWORD, "Server-only Yo! API password"],
  ["YO_INSTANT_NOTIFICATION_URL", process.env.YO_INSTANT_NOTIFICATION_URL, "Success notification URL"],
  ["YO_FAILURE_NOTIFICATION_URL", process.env.YO_FAILURE_NOTIFICATION_URL, "Failure notification URL"],
  ["PORTAL_SESSION_SECRET", process.env.PORTAL_SESSION_SECRET, "Secret used to sign portal sessions"],
];
export default function IntegrationsPage() {
  return (
    <main className="page">
      <div className="shell">
        <div className="page-head">
          <div>
            <Link href="/" style={{ color: "var(--muted)", fontSize: 14 }}>← Back home</Link>
            <h1>Payment integration</h1>
            <p className="section-copy">Yo! Payments configuration status. Secret values are never displayed here.</p>
          </div>
        </div>
        <div className="glass card">
          <div className="config-list">
            {configs.map(([key, value, hint]) => (
              <div className="config-row" key={key}>
                <div>
                  <div className="config-key">{key}</div>
                  <div className="config-hint">{hint}</div>
                </div>
                <div className={"config-state " + (value ? "ready" : "missing")}>
                  <span className="status-dot" style={{ background: value ? "var(--accent)" : "#fb7185" }} />
                  {value ? "Configured" : "Missing"}
                </div>
              </div>
            ))}
          </div>
          <div className="summary">
            <div className="summary-row"><span>Provider</span><strong>Yo! Payments</strong></div>
            <div className="summary-row"><span>Environment</span><strong>{process.env.YO_ENVIRONMENT === "production" ? "Production" : "Sandbox"}</strong></div>
            <div className="summary-row"><span>Currency</span><strong>UGX</strong></div>
            <div className="summary-row"><span>Networks</span><strong>MTN / Airtel Uganda</strong></div>
          </div>
          <div className="pending">Add the values in Vercel Environment Variables. Never commit payment credentials to GitHub.</div>
        </div>
      </div>
    </main>
  );
}
