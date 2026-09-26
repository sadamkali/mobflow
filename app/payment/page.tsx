"use client";
import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PACKAGES, type PackageId } from "@/lib/packages";
type PaymentState="idle"|"validating"|"starting"|"pending"|"success"|"failed";
const money=new Intl.NumberFormat("en-UG");

function PaymentForm(){
  const params=useSearchParams();
  const initial=params.get("package") as PackageId|null;
  const [packageId,setPackageId]=useState<PackageId>(initial||PACKAGES[4].id);
  const [msisdn,setMsisdn]=useState("");
  const [state,setState]=useState<PaymentState>("idle");
  const [error,setError]=useState("");
  const [message,setMessage]=useState("");
  const [internalReference,setInternalReference]=useState("");
  const selected=useMemo(()=>PACKAGES.find(p=>p.id===packageId)||PACKAGES[4],[packageId]);

  useEffect(()=>{
    if(state!=="pending"||!internalReference)return;
    let cancelled=false;let timer:ReturnType<typeof setTimeout>|undefined;
    const poll=async()=>{
      try{
        const response=await fetch("/api/payments/status?internalReference="+encodeURIComponent(internalReference),{cache:"no-store"});
        const data=await response.json();if(cancelled)return;
        if(data.status==="success"){setState("success");setMessage(data.message||"Payment completed successfully.");return;}
        if(data.status==="failed"){setState("failed");setError(data.message||"Payment failed.");return;}
      }catch{}
      timer=setTimeout(poll,5000);
    };
    poll();
    return()=>{cancelled=true;if(timer)clearTimeout(timer)};
  },[state,internalReference]);

  async function submit(){
    setError("");setMessage("");
    if(!msisdn.trim()){setError("Enter the MTN or Airtel number you will pay from.");return;}
    try{
      setState("validating");
      const vr=await fetch("/api/payments/validate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({msisdn})});
      const vd=await vr.json();if(!vr.ok||!vd.valid)throw new Error(vd.message||"That mobile-money number could not be validated.");
      setState("starting");
      const r=await fetch("/api/payments/initiate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({packageId:selected.id,msisdn})});
      const d=await r.json();if(!r.ok)throw new Error(d.message||"Unable to start the payment.");
      setInternalReference(d.internalReference);setState("pending");setMessage("Payment request sent. Approve it on your phone.");
    }catch(err){setState("failed");setError(err instanceof Error?err.message:"Unable to start payment.");}
  }

  return <div className="glass card">
    <div className="form-grid">
      <div className="field full"><label htmlFor="package">Package</label><select id="package" value={packageId} onChange={e=>setPackageId(e.target.value as PackageId)}>{PACKAGES.map(pkg=><option key={pkg.id} value={pkg.id} style={{color:"#0f172a"}}>{pkg.label} — UGX {money.format(pkg.amount)}</option>)}</select></div>
      <div className="field full"><label htmlFor="msisdn">MTN or Airtel number</label><input id="msisdn" value={msisdn} onChange={e=>setMsisdn(e.target.value)} placeholder="07XXXXXXXX" inputMode="tel" autoComplete="tel"/></div>
    </div>
    <div className="summary"><div className="summary-row"><span>Package</span><strong>{selected.label}</strong></div><div className="summary-row"><span>Amount</span><strong>UGX {money.format(selected.amount)}</strong></div><div className="summary-row"><span>Provider</span><strong>Relworx · MTN / Airtel</strong></div></div>
    {error&&<div className="error">{error}</div>}{message&&state==="pending"&&<div className="pending">{message}</div>}{message&&state==="success"&&<div className="success">{message}</div>}
    <div className="actions"><button className="btn primary" onClick={submit} disabled={state==="validating"||state==="starting"||state==="pending"}>{state==="validating"?"Checking number…":state==="starting"?"Starting payment…":state==="pending"?"Waiting for approval…":state==="success"?"Payment complete":"Pay now"}</button></div>
    <p className="mini-note">Your payment credentials stay on the server. The browser only communicates with this app.</p>
  </div>;
}

export default function PaymentPage(){
  return <main className="page"><div className="shell">
    <div className="page-head"><div><Link href="/" style={{color:"var(--muted)",fontSize:14}}>← Back home</Link><h1>Make a payment</h1><p className="section-copy">Choose your package and pay with MTN or Airtel Mobile Money.</p></div></div>
    <Suspense fallback={<div className="glass card"><p className="section-copy">Loading payment form…</p></div>}><PaymentForm/></Suspense>
  </div></main>;
}
