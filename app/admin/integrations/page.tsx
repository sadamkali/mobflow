import Link from "next/link";
const configs=[
 ["RELWORX_API_BASE_URL",process.env.RELWORX_API_BASE_URL||"https://payments.relworx.com/api","Relworx API base URL"],
 ["RELWORX_API_KEY",process.env.RELWORX_API_KEY,"Server-only Relworx API key"],
 ["RELWORX_ACCOUNT_NO",process.env.RELWORX_ACCOUNT_NO,"Relworx business account number"],
 ["RELWORX_WEBHOOK_SECRET",process.env.RELWORX_WEBHOOK_SECRET,"Relworx webhook authentication key"],
 ["RELWORX_WEBHOOK_URL",process.env.RELWORX_WEBHOOK_URL,"Exact webhook URL used for signature verification"]
];
export default function IntegrationsPage(){return <main className="page"><div className="shell"><div className="page-head"><div><Link href="/" style={{color:"var(--muted)",fontSize:14}}>← Back home</Link><h1>Payment integration</h1><p className="section-copy">Relworx configuration status. Secret values are never displayed here.</p></div></div>
<div className="glass card"><div className="config-list">{configs.map(([key,value,hint])=><div className="config-row" key={key}><div><div className="config-key">{key}</div><div className="config-hint">{hint}</div></div><div className={"config-state "+(value?"ready":"missing")}><span className="status-dot" style={{background:value?"var(--accent)":"#fb7185"}}/>{value?"Configured":"Missing"}</div></div>)}</div>
<div className="summary"><div className="summary-row"><span>Provider</span><strong>Relworx Payments API v2</strong></div><div className="summary-row"><span>Currency</span><strong>UGX</strong></div><div className="summary-row"><span>Networks</span><strong>MTN / Airtel Uganda</strong></div></div>
<div className="pending">For production, add these values in Vercel Environment Variables. Never commit .env.local or API keys to GitHub.</div></div></div></main>}
