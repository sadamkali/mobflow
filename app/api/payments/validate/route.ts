import { NextResponse } from "next/server";
import { normalizeUgandaMsisdn } from "@/lib/phone";
import { validateMobileNumber } from "@/lib/relworx";
export const runtime="nodejs";
export async function POST(request:Request){
 try{
  const body=await request.json();const msisdn=normalizeUgandaMsisdn(String(body?.msisdn??""));
  if(!msisdn)return NextResponse.json({valid:false,message:"Enter a valid Ugandan MTN or Airtel number."},{status:400});
  const result=await validateMobileNumber(msisdn);
  return NextResponse.json({valid:result.success===true,msisdn,customerName:typeof result.customer_name==="string"?result.customer_name:null,message:typeof result.message==="string"?result.message:"Number validated."});
 }catch(error){return NextResponse.json({valid:false,message:error instanceof Error?error.message:"Unable to validate number."},{status:502})}
}
