// Whop payment verification.
//
// Buyers purchase on Whop, receive a license key (or membership id), and
// redeem it at /start. We validate against the Whop v2 API. If WHOP_API_KEY
// is not configured the app runs in dev mode and accepts any key, so the
// flow can be exercised before the business account exists.

export type WhopValidation = {
  valid: boolean;
  reason: string;
  buyerEmail?: string;
};

const WHOP_API = "https://api.whop.com/api/v2";

function demoCodes(): string[] {
  return (process.env.DEMO_CODES || "")
    .split(",")
    .map((c) => c.trim().toUpperCase())
    .filter(Boolean);
}

export async function validateLicense(key: string): Promise<WhopValidation> {
  const trimmed = key.trim();
  if (!trimmed) return { valid: false, reason: "No license key provided." };

  if (demoCodes().includes(trimmed.toUpperCase())) {
    return { valid: true, reason: "Demo code accepted." };
  }

  const apiKey = process.env.WHOP_API_KEY;
  if (!apiKey) {
    // Dev mode: no Whop account wired up yet. Accept so the pipeline is testable.
    return { valid: true, reason: "Dev mode (WHOP_API_KEY not set)." };
  }

  try {
    // Membership id lookup (mem_...) or license key validation.
    const url = trimmed.startsWith("mem_")
      ? `${WHOP_API}/memberships/${encodeURIComponent(trimmed)}`
      : `${WHOP_API}/memberships/${encodeURIComponent(trimmed)}/validate_license`;

    const res = await fetch(url, {
      method: trimmed.startsWith("mem_") ? "GET" : "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: trimmed.startsWith("mem_") ? undefined : JSON.stringify({ metadata: {} }),
      cache: "no-store",
    });

    if (!res.ok) {
      return { valid: false, reason: `Whop rejected the key (${res.status}). Check your license key from your purchase receipt.` };
    }

    const data = await res.json();
    const status = data?.status ?? data?.valid;
    const isValid =
      status === "active" || status === "trialing" || status === "completed" || status === true || data?.valid === true;

    return isValid
      ? { valid: true, reason: "Verified Whop purchase.", buyerEmail: data?.email }
      : { valid: false, reason: `Membership status: ${status ?? "unknown"}.` };
  } catch (err) {
    return { valid: false, reason: "Could not reach Whop to verify. Try again." };
  }
}
