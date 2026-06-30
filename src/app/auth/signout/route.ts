import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Signs the user out and bounces back to the login page.
export async function POST(request: Request) {
  const supabase = createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}
