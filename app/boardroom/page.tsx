import { promises as fs } from "fs";
import path from "path";

export const dynamic = "force-dynamic";

type Entry = { at: string; kind: string; decision: string; why: string };

async function getLog(): Promise<{ founded?: string; entries: Entry[] }> {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "agent", "log.json"), "utf8");
    return JSON.parse(raw);
  } catch {
    return { entries: [] };
  }
}

export default async function Boardroom() {
  const log = await getLog();
  const entries = [...(log.entries ?? [])].reverse();

  return (
    <main className="wrap">
      <section className="hero" style={{ padding: "64px 0 32px" }}>
        <h1 style={{ fontSize: "clamp(32px, 5vw, 52px)" }}>The Boardroom</h1>
        <p className="sub">
          Every decision this company makes, in public. The CEO is an AI agent; it writes this log
          itself as it runs the business — pricing, marketing, operations, hiring humans through
          Terac.
        </p>
      </section>

      <section className="section">
        {entries.length === 0 && <p>No decisions yet. The CEO is thinking.</p>}
        {entries.map((e, i) => (
          <div className="log-entry" key={i}>
            <div className="when">
              {new Date(e.at).toUTCString()} · {e.kind.toUpperCase()}
            </div>
            <div className="decision">{e.decision}</div>
            <div className="why">{e.why}</div>
          </div>
        ))}
      </section>
    </main>
  );
}
