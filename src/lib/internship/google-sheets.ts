import type { InternshipApplication } from "@/lib/internship/types";

export function isGoogleSheetsConfigured() {
  return Boolean(process.env.GOOGLE_SHEETS_WEBHOOK_URL);
}

const APPS_SCRIPT_HEADERS = {
  "Content-Type": "text/plain;charset=utf-8",
  "User-Agent": "SDOT-InternshipBot/1.0",
} as const;

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function readAppsScriptResult(location: string) {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await sleep(400 * attempt);

    const result = await fetch(location, {
      method: "GET",
      headers: { "User-Agent": APPS_SCRIPT_HEADERS["User-Agent"] },
      redirect: "follow",
    });
    const text = await result.text();

    if (result.ok) return text;

    lastError = new Error(
      `Google Sheets result error (${result.status}): ${text.slice(0, 300)}`,
    );
  }

  throw lastError ?? new Error("Google Sheets result unavailable.");
}

async function readAppsScriptResponse(response: Response) {
  // Apps Script web apps often 302 to a one-time result URL after POST.
  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get("location");
    if (!location) {
      throw new Error("Google Sheets webhook redirected without a location.");
    }
    return readAppsScriptResult(location);
  }

  const text = await response.text();
  if (!response.ok) {
    throw new Error(
      `Google Sheets webhook error (${response.status}): ${text.slice(0, 500)}`,
    );
  }
  return text;
}

export async function appendToGoogleSheet(
  application: InternshipApplication,
  meta?: { notionError?: string },
) {
  const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  if (!webhookUrl) {
    throw new Error("Google Sheets webhook is not configured.");
  }

  const secret = process.env.GOOGLE_SHEETS_WEBHOOK_SECRET;
  const payload = {
    secret: secret || undefined,
    source: "sdot-internship",
    storedVia: "google-sheets-fallback",
    notionError: meta?.notionError ?? "",
    ...application,
    interests: application.interests.join(", "),
    tools: application.tools.join(", "),
  };

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: APPS_SCRIPT_HEADERS,
    body: JSON.stringify(payload),
    redirect: "manual",
  });

  const text = await readAppsScriptResponse(response);

  if (!text.trim()) {
    return { ok: true as const };
  }

  if (text.trimStart().startsWith("<!DOCTYPE") || text.includes("<html")) {
    throw new Error(
      "Google Sheets webhook returned HTML instead of JSON. Redeploy the Apps Script web app with access set to Anyone, from the Sheet itself.",
    );
  }

  let data: { ok?: boolean; error?: string };
  try {
    data = JSON.parse(text) as { ok?: boolean; error?: string };
  } catch {
    return { ok: true as const };
  }

  if (data.ok === false || data.error) {
    throw new Error(data.error || "Google Sheets webhook rejected the row.");
  }

  return { ok: true as const };
}
