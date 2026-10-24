// Exa — web search for AI agents. Used to pull the customer's competitive
// landscape into the roast, so the critique is grounded in how rival products
// actually position themselves. Gracefully skipped if EXA_API_KEY is unset.

export type Competitor = { title: string; url: string; snippet: string };

export async function findCompetitors(pageTitle: string, pageUrl: string): Promise<Competitor[]> {
  const key = process.env.EXA_API_KEY;
  if (!key || !pageTitle) return [];

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch("https://api.exa.ai/search", {
      method: "POST",
      signal: controller.signal,
      headers: { "x-api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `products or startups competing with: ${pageTitle}`,
        type: "auto",
        numResults: 4,
        contents: { text: { maxCharacters: 400 } },
      }),
    });
    clearTimeout(timer);
    if (!res.ok) {
      console.log(`[exa] search failed: ${res.status}`);
      return [];
    }
    const data = await res.json();
    const host = new URL(pageUrl).hostname.replace(/^www\./, "");
    return (data?.results ?? [])
      .filter((r: any) => {
        try {
          return new URL(r.url).hostname.replace(/^www\./, "") !== host;
        } catch {
          return false;
        }
      })
      .slice(0, 3)
      .map((r: any) => ({
        title: r.title ?? r.url,
        url: r.url,
        snippet: (r.text ?? "").slice(0, 400),
      }));
  } catch {
    console.log("[exa] search errored; roasting without competitive context");
    return [];
  }
}

export function competitorContext(competitors: Competitor[]): string {
  if (!competitors.length) return "";
  return (
    "\n\nCOMPETITIVE LANDSCAPE (found via Exa web search — real pages competing for this customer's buyers):\n" +
    competitors
      .map((c, i) => `${i + 1}. ${c.title} (${c.url})\n   Positioning: ${c.snippet}`)
      .join("\n")
  );
}
