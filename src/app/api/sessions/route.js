import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET() {
  const { data, error } = await supabase
    .from("chat_sessions")
    .select("id, title, created_at")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ sessions: data ?? [] });
}

export async function POST(req) {
  const body = await req.json();
  const title = body?.title?.toString()?.trim() || "New Session";
  const { data, error } = await supabase
    .from("chat_sessions")
    .insert({ title })
    .select("id, title, created_at")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ session: data });
}


