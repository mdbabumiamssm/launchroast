"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import variants from "@/study/variants.json";

// Terac panel study page. Terac routes paid human panelists here with
// tracking params (teracSubmissionId, taskId). They compare two versions of
// our product, vote, and are redirected to Terac's completion callback.

function md(text: string) {
  return text.split("\n").map((line, i) => {
    if (line.trim() === "---") return <hr key={i} style={{ border: "none", borderTop: "1px solid var(--border)", margin: "18px 0" }} />;
    if (line.startsWith("# ")) return <h2 key={i}>{line.slice(2)}</h2>;
    if (line.startsWith("## ")) return <h3 key={i} style={{ margin: "16px 0 8px", color: "var(--flame-soft)" }}>{line.slice(3)}</h3>;
    const parts = line.split(/(\*\*[^*]+\*\*)/g).map((p, j) =>
      p.startsWith("**") && p.endsWith("**") ? <strong key={j}>{p.slice(2, -2)}</strong> : p,
    );
    return <div key={i} style={{ minHeight: line.trim() ? undefined : 10 }}>{parts}</div>;
  });
}

type Q = "worth" | "trust" | "share";
const QUESTIONS: { key: Q; label: string }[] = [
  { key: "worth", label: "1. Which version feels more worth $9?" },
  { key: "trust", label: "2. Which would you trust more to actually improve sales?" },
  { key: "share", label: "3. Which would you screenshot and share?" },
];

function StudyInner() {
  const params = useSearchParams();
  const [order, setOrder] = useState<["A", "B"] | ["B", "A"]>(["A", "B"]);
  const [answers, setAnswers] = useState<Record<Q, string>>({ worth: "", trust: "", share: "" });
  const [upsell, setUpsell] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");

  useEffect(() => {
    setOrder(Math.random() < 0.5 ? ["A", "B"] : ["B", "A"]);
  }, []);

  const labels = useMemo(() => {
    const m: Record<string, string> = {};
    m[order[0]] = "Critique 1";
    m[order[1]] = "Critique 2";
    return m;
  }, [order]);

  const allAnswered = QUESTIONS.every((q) => answers[q.key]);

  async function submit() {
    setState("busy");
    try {
      const qs = params.toString();
      const res = await fetch("/api/study-vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId: params.get("teracSubmissionId") || params.get("submissionId") || "direct",
          taskId: params.get("taskId") || "",
          answers,
          upsell,
          displayedFirst: order[0],
          at: new Date().toISOString(),
        }),
      });
      if (!res.ok) throw new Error("save failed");
      setState("done");
      // Redirect to Terac's completion callback so the panelist gets paid.
      if (params.get("teracSubmissionId") || params.get("submissionId")) {
        window.location.href = `https://terac.com/api/external/callback?${qs}${qs ? "&" : ""}result=completed`;
      }
    } catch {
      setState("error");
    }
  }

  return (
    <main className="wrap">
      <div className="panel">
        <h2>Which critique is worth $9? (~5 minutes)</h2>
        <p style={{ color: "var(--muted)", marginTop: 10 }}>
          LaunchRoast sells a $9 AI-written critique of startup landing pages. Below are <strong>two
          versions of the same critique</strong> of the same real website, written in two different
          styles. Imagine <em>you</em> built that website and paid $9 for this. Read both (skimming is
          fine — react like a real customer), then answer 4 quick questions. Your answers directly
          decide which style this product ships.
        </p>
      </div>

      {order.map((v) => (
        <div className="panel" key={v}>
          <h2 style={{ color: "var(--flame)" }}>{labels[v]}</h2>
          <div className="roast-output" style={{ fontSize: 15 }}>{md((variants as any)[v].content)}</div>
        </div>
      ))}

      <div className="panel">
        <h2>Your verdict</h2>
        {QUESTIONS.map((q) => (
          <div key={q.key} style={{ margin: "18px 0" }}>
            <p style={{ marginBottom: 8 }}>{q.label}</p>
            {order.map((v) => (
              <label key={v} style={{ marginRight: 24, cursor: "pointer" }}>
                <input
                  type="radio"
                  name={q.key}
                  checked={answers[q.key] === v}
                  onChange={() => setAnswers({ ...answers, [q.key]: v })}
                  style={{ marginRight: 6 }}
                />
                {labels[v]}
              </label>
            ))}
          </div>
        ))}
        <label htmlFor="upsell" style={{ display: "block", margin: "18px 0 6px", color: "var(--muted)" }}>
          4. In one sentence: what would make this worth $19 instead of $9?
        </label>
        <input
          id="upsell"
          value={upsell}
          onChange={(e) => setUpsell(e.target.value)}
          placeholder="e.g. include a video walkthrough of the fixes"
          maxLength={300}
        />
        <div style={{ marginTop: 22 }}>
          <button className="btn" onClick={submit} disabled={!allAnswered || !upsell.trim() || state === "busy" || state === "done"}>
            {state === "busy" ? "Submitting…" : state === "done" ? "Submitted ✓" : "Submit & finish"}
          </button>
        </div>
        {state === "error" && <p className="error">Something went wrong saving your answers — please try again.</p>}
        {state === "done" && (
          <p style={{ color: "var(--muted)", marginTop: 12 }}>
            Thank you! If you're a Terac panelist you'll be redirected automatically to complete the task.
          </p>
        )}
      </div>
    </main>
  );
}

export default function StudyPage() {
  return (
    <Suspense>
      <StudyInner />
    </Suspense>
  );
}
