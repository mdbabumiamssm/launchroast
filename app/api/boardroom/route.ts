import { promises as fs } from "fs";
import path from "path";

export const runtime = "nodejs";

// Serves the CEO agent's decision log. The agent (agent/ceo.mjs) appends to
// agent/log.json and pushes; each push redeploys, so this stays current.
export async function GET() {
  try {
    const file = path.join(process.cwd(), "agent", "log.json");
    const raw = await fs.readFile(file, "utf8");
    return new Response(raw, {
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json({ company: "LaunchRoast", entries: [] });
  }
}
