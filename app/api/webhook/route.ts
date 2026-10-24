import { NextRequest } from "next/server";
import crypto from "crypto";
import { createTeracTask } from "@/lib/terac";

// Whop webhook receiver. Point dash.whop.com -> Developer -> Webhooks here.
// On every sale the company autonomously reacts: logs revenue and files a
// Terac task for a human to spot-check the customer experience.

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const raw = await req.text();

  const secret = process.env.WHOP_WEBHOOK_SECRET;
  if (secret) {
    const sig = req.headers.get("x-whop-signature") ?? req.headers.get("whop-signature") ?? "";
    const expected = crypto.createHmac("sha256", secret).update(raw).digest("hex");
    const provided = sig.replace(/^sha256=/, "");
    const a = Buffer.from(expected);
    const b = Buffer.from(provided);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return Response.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  let event: any = {};
  try {
    event = JSON.parse(raw);
  } catch {
    return Response.json({ error: "Bad payload" }, { status: 400 });
  }

  const action = event?.action ?? event?.type ?? "unknown";
  console.log(`[whop-webhook] ${action}`, JSON.stringify(event?.data ?? {}).slice(0, 500));

  if (String(action).includes("payment") || String(action).includes("went_valid")) {
    // A sale happened. The company reacts without humans.
    void createTeracTask({
      title: "Spot-check: new LaunchRoast customer experience",
      instructions:
        "A customer just purchased a LaunchRoast ($9 landing page teardown). " +
        "Within the next hour, verify the product page and checkout flow are working " +
        "end-to-end. Reply PASS or FAIL with one sentence.",
      context: `Whop event: ${action} at ${new Date().toISOString()}`,
      maxPayoutUsd: 1,
    });
  }

  return Response.json({ ok: true });
}
