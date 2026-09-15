import { NextResponse } from "next/server";
import { publicApiError } from "@/lib/api-error";
import {
  appendToGoogleSheet,
  isGoogleSheetsConfigured,
} from "@/lib/internship/google-sheets";
import { makeRefId } from "@/lib/internship/ref-id";
import { appendToNotion, isNotionConfigured } from "@/lib/internship/notion";
import type { InternshipApplicationInput } from "@/lib/internship/types";
import {
  normalizeInternshipInput,
  validateInternshipInput,
} from "@/lib/internship/validate";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

async function mirrorToSheets(
  application: Parameters<typeof appendToGoogleSheet>[0],
  notionError: string,
) {
  if (!isGoogleSheetsConfigured()) return false;
  try {
    await appendToGoogleSheet(application, { notionError });
    return true;
  } catch (error) {
    console.error("[internship] Google Sheets write failed:", error);
    return false;
  }
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(
    `internship:${ip}`,
    process.env.NODE_ENV === "development" ? 50 : 5,
    60 * 60 * 1000,
  );

  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: "Too many submissions. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfter) },
      },
    );
  }

  const notionReady = isNotionConfigured();
  const sheetsReady = isGoogleSheetsConfigured();

  if (!notionReady && !sheetsReady) {
    return NextResponse.json(
      {
        error:
          "Intake is not connected yet. Configure Notion or Google Sheets.",
      },
      { status: 503 },
    );
  }

  let body: InternshipApplicationInput;
  try {
    body = (await request.json()) as InternshipApplicationInput;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const validationError = validateInternshipInput(body);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const refId = makeRefId();
  const submittedAt = new Date().toISOString();
  const application = normalizeInternshipInput(body, refId, submittedAt);

  let notionError: unknown = null;

  if (notionReady) {
    try {
      await appendToNotion(application);
      const mirrored = await mirrorToSheets(application, "");
      return NextResponse.json({
        refId,
        submittedAt,
        storedVia: mirrored ? ("notion+sheets" as const) : ("notion" as const),
      });
    } catch (error) {
      notionError = error;
      console.error("[internship] Notion write failed:", error);
    }
  }

  if (sheetsReady) {
    try {
      await appendToGoogleSheet(application, {
        notionError:
          notionError instanceof Error
            ? notionError.message
            : notionError
              ? String(notionError)
              : notionReady
                ? "Notion write failed"
                : "Notion not configured",
      });

      return NextResponse.json({
        refId,
        submittedAt,
        storedVia: "google-sheets-fallback" as const,
      });
    } catch (sheetsError) {
      console.error("[internship] Google Sheets fallback failed:", sheetsError);
      return NextResponse.json(
        {
          error: publicApiError(
            sheetsError,
            "Could not file the application. Please try again in a few minutes.",
            "internship",
          ),
        },
        { status: 502 },
      );
    }
  }

  // Notion failed and Sheets webhook is not configured
  return NextResponse.json(
    {
      error: publicApiError(
        notionError,
        "Could not file the application. Notion failed and Google Sheets fallback is not configured.",
        "internship",
      ),
    },
    { status: 502 },
  );
}
