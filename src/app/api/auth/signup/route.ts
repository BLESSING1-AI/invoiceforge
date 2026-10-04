import { NextRequest, NextResponse } from "next/server";
import { signUp } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, name, businessName } = body;

    if (!email || !password || !name || !businessName) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    const result = await signUp(email, password, name, businessName);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true, userId: result.user.id });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
