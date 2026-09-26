import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getPackage } from "@/lib/packages";
import { normalizeUgandaMsisdn } from "@/lib/phone";
import { requestPayment } from "@/lib/relworx";
export const runtime="nodejs";
export async function POST(request:Request){
 try{
  const body=await request.json();const packageId=String(body?.packageId??"");const msisdn=normalizeUgandaMsisdn(String(body?.msisdn??""));const pkg=getPackage(packageId);
  if(!pkg)return NextResponse.json({message:"Choose a valid package."},{status:400});
  if(!msisdn)return NextResponse.json({message:"Enter a valid Ugandan mobile-money number."},{status:400});
  const reference="MF_"+randomUUID().replace(/-/g,"").slice(0,28);
  const result=await requestPayment({reference,msisdn,amount:pkg.amount,description:"MobiFlow "+pkg.label+" package"});
  if(result.success!==true||typeof result.internal_reference!=="string")return NextResponse.json({message:typeof result.message==="string"?result.message:"Relworx rejected the payment request."},{status:502});
  return NextResponse.json({ok:true,reference,internalReference:result.internal_reference,amount:pkg.amount,msisdn,status:"pending"});
 }catch(error){return NextResponse.json({message:error instanceof Error?error.message:"Unable to start payment."},{status:502})}
}
