import { NextRequest } from "next/server";
import { put, list } from "@vercel/blob";

export const runtime = "nodejs";

// Stores one Terac panelist vote per blob. Read back with GET (aggregate).

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "bad json" }, { status: 400 });
  }

  const vote = {
    submissionId: String(body.submissionId ?? "unknown").slice(0, 120),
    taskId: String(body.taskId ?? "").slice(0, 120),
    answers: {
      worth: body?.answers?.worth === "B" ? "B" : "A",
      trust: body?.answers?.trust === "B" ? "B" : "A",
      share: body?.answers?.share === "B" ? "B" : "A",
    },
    upsell: String(body.upsell ?? "").slice(0, 400),
    displayedFirst: body.displayedFirst === "B" ? "B" : "A",
    at: new Date().toISOString(),
    ua: req.headers.get("user-agent")?.slice(0, 120) ?? "",
  };

  try {
    await put(`votes/${Date.now()}-${vote.submissionId}.json`, JSON.stringify(vote), {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: true,
    });
  } catch (err) {
    console.error("[study-vote] blob write failed", err);
    return Response.json({ error: "storage failed" }, { status: 500 });
  }

  console.log("[study-vote] recorded", JSON.stringify(vote));
  return Response.json({ ok: true });
}

export async function GET() {
  try {
    const { blobs } = await list({ prefix: "votes/", limit: 1000 });
    const votes = await Promise.all(
      blobs.map(async (b) => {
        try {
          return await (await fetch(b.url, { cache: "no-store" })).json();
        } catch {
          return null;
        }
      }),
    );
    const valid = votes.filter(Boolean) as any[];
    const tally = { worth: { A: 0, B: 0 }, trust: { A: 0, B: 0 }, share: { A: 0, B: 0 } };
    for (const v of valid) {
      for (const k of ["worth", "trust", "share"] as const) {
        if (v.answers?.[k] === "A") tally[k].A++;
        else if (v.answers?.[k] === "B") tally[k].B++;
      }
    }
    return Response.json({ count: valid.length, tally, upsellIdeas: valid.map((v) => v.upsell).filter(Boolean), votes: valid });
  } catch (err) {
    return Response.json({ count: 0, tally: null, error: "list failed" }, { status: 500 });
  }
}
