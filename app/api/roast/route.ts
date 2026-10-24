import { NextRequest } from "next/server";
import { validateLicense } from "@/lib/whop";
import { fetchPageContent, streamRoast } from "@/lib/roast";
import { findCompetitors, competitorContext } from "@/lib/exa";
import { queueRoastQA } from "@/lib/terac";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  let body: { licenseKey?: string; url?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Bad request." }, { status: 400 });
  }

  const { licenseKey = "", url = "" } = body;

  const license = await validateLicense(licenseKey);
  if (!license.valid) {
    return Response.json({ error: license.reason }, { status: 402 });
  }

  let pageContent: string;
  try {
    pageContent = await fetchPageContent(url);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Could not fetch that page." },
      { status: 422 },
    );
  }

  // Exa: ground the roast in the customer's real competitive landscape.
  const title = pageContent.match(/^TITLE: (.*)$/m)?.[1] ?? "";
  const competitors = await findCompetitors(title, url);

  const encoder = new TextEncoder();
  const stream = streamRoast(pageContent + competitorContext(competitors));
  const chunks: string[] = [];

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            chunks.push(event.delta.text);
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        // Autonomous human-in-the-loop: file a Terac QA task on the delivered roast.
        queueRoastQA(url, chunks.join(""));
        controller.close();
      } catch (err) {
        controller.enqueue(
          encoder.encode("\n\n---\n⚠️ The roast engine hiccuped. Refresh and try again — your license is still valid."),
        );
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
