import { NextResponse } from "next/server";
import { checkRequestStatus } from "@/lib/relworx";
export const runtime="nodejs";
export async function GET(request:Request){
 try{
  const url=new URL(request.url);const internalReference=url.searchParams.get("internalReference")?.trim();
  if(!internalReference)return NextResponse.json({message:"internalReference is required."},{status:400});
  const result=await checkRequestStatus(internalReference);
  return NextResponse.json({
   success:result.success===true,
   status:typeof result.request_status==="string"?result.request_status:typeof result.status==="string"?result.status:"pending",
   message:typeof result.message==="string"?result.message:"Payment status checked.",
   provider:result.provider??null,amount:result.amount??null,currency:result.currency??null,
   customerReference:result.customer_reference??null,internalReference:result.internal_reference??internalReference,completedAt:result.completed_at??null
  });
 }catch(error){return NextResponse.json({message:error instanceof Error?error.message:"Unable to check payment status."},{status:502})}
}
