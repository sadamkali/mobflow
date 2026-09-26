import { NextResponse } from "next/server";
import { verifyRelworxWebhookSignature } from "@/lib/webhook";
export const runtime="nodejs";
function value(form:URLSearchParams,key:string){return form.get(key)||""}
export async function POST(request:Request){
 const key=process.env.RELWORX_WEBHOOK_SECRET;const webhookUrl=process.env.RELWORX_WEBHOOK_URL;
 if(!key||!webhookUrl)return NextResponse.json({message:"Webhook configuration is missing."},{status:503});
 const signature=request.headers.get("Relworx-Signature");const raw=await request.text();const contentType=request.headers.get("content-type")||"";
 let form=new URLSearchParams();
 if(contentType.includes("application/x-www-form-urlencoded"))form=new URLSearchParams(raw);
 else{try{const parsed=JSON.parse(raw) as Record<string,unknown>;form=new URLSearchParams(Object.entries(parsed).map(([k,v])=>[k,String(v??"")]))}catch{return NextResponse.json({message:"Invalid webhook payload."},{status:400})}}
 const payload={status:value(form,"status"),customer_reference:value(form,"customer_reference"),internal_reference:value(form,"internal_reference")};
 if(!payload.status||!payload.internal_reference)return NextResponse.json({message:"Incomplete webhook payload."},{status:400});
 const verified=verifyRelworxWebhookSignature({signatureHeader:signature,webhookUrl,webhookKey:key,params:payload,maxAgeSeconds:300});
 if(!verified)return NextResponse.json({message:"Invalid webhook signature."},{status:401});
 console.log("Verified Relworx webhook",payload);
 return NextResponse.json({received:true});
}
