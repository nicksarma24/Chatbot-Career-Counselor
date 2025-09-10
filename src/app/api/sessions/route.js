import { NextResponse } from "next/server";

export async function POST(req) {
	try {
		const body = await req.json().catch(() => ({}));
		const title = typeof body?.title === "string" && body.title.trim().length > 0 ? body.title.trim() : "New Session";
		const session = {
			id: crypto.randomUUID(),
			title,
			created_at: new Date().toISOString(),
		};
		return NextResponse.json({ session });
	} catch (e) {
		return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
	}
}


