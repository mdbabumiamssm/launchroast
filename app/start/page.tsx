"use client";

import { useState, useRef } from "react";

// Minimal markdown-ish renderer: headings + bold, keeps everything else as text.
function renderRoast(md: string) {
  return md.split("\n").map((line, i) => {
    if (line.startsWith("# ")) return <h1 key={i}>{line.slice(2)}</h1>;
    if (line.startsWith("## ")) return <h2 key={i}>{line.slice(3)}</h2>;
    const parts = line.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
      part.startsWith("**") && part.endsWith("**") ? <strong key={j}>{part.slice(2, -2)}</strong> : part,
    );
    return <div key={i}>{parts.length ? parts : " "}</div>;
  });
}

export default function StartPage() {
  const [licenseKey, setLicenseKey] = useState("");
  const [url, setUrl] = useState("");
  const [roast, setRoast] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const outputRef = useRef<HTMLDivElement>(null);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setRoast("");
    setBusy(true);
    try {
      const res = await fetch("/api/roast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ licenseKey, url }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Something went wrong (${res.status}).`);
      }
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setRoast(acc);
        outputRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="wrap">
      <div className="panel">
        <h2>Redeem your roast</h2>
        <p style={{ color: "var(--muted)", marginTop: 8 }}>
          Your license key is on your Whop receipt. Paste it with your landing page URL and the
          roast streams in live.
        </p>
        <form onSubmit={run}>
          <label htmlFor="key">Whop license key</label>
          <input
            id="key"
            value={licenseKey}
            onChange={(e) => setLicenseKey(e.target.value)}
            placeholder="L-XXXXXX-XXXXXXXX or mem_..."
            required
          />
          <label htmlFor="url">Landing page URL</label>
          <input
            id="url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://yourstartup.com"
            required
          />
          <div style={{ marginTop: 24 }}>
            <button className="btn" type="submit" disabled={busy}>
              {busy ? "Roasting…" : "Roast it 🔥"}
            </button>
          </div>
        </form>
        {error && <p className="error">{error}</p>}
      </div>

      {(roast || busy) && (
        <div className="panel" ref={outputRef}>
          <div className="roast-output">
            {renderRoast(roast)}
            {busy && <span className="cursor" />}
          </div>
        </div>
      )}
    </main>
  );
}
