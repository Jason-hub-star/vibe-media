"use server";

import {
  DEFAULT_CANONICAL_LOCALE,
  DEFAULT_TARGET_LOCALES,
  type ShowcaseLink,
} from "@vibehub/content-contracts";
import { revalidatePath } from "next/cache";
import { saveShowcaseEntry } from "@vibehub/backend";

export interface ShowcaseFormState {
  status: "idle" | "success" | "error";
  message: string | null;
}

const initialState: ShowcaseFormState = {
  status: "idle",
  message: null
};

const SHOWCASE_REVALIDATE_LOCALES = Array.from(
  new Set([DEFAULT_CANONICAL_LOCALE, ...DEFAULT_TARGET_LOCALES]),
);

function toText(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function parseBoolean(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function parseTimezoneOffset(value: string) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid timezone offset for ${value}`);
  }
  return parsed;
}

function parseDateTimeValue(value: string, timezoneOffsetMinutes: number) {
  if (!value) return null;

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!match) {
    throw new Error(`Invalid date value for ${value}`);
  }

  const [, year, month, day, hour, minute] = match;
  const utcTime =
    Date.UTC(
      Number.parseInt(year, 10),
      Number.parseInt(month, 10) - 1,
      Number.parseInt(day, 10),
      Number.parseInt(hour, 10),
      Number.parseInt(minute, 10)
    ) +
    timezoneOffsetMinutes * 60 * 1000;

  return new Date(utcTime).toISOString();
}

function parseStringList(value: string, separator: RegExp | string) {
  return value
    .split(separator)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseLinks(value: string): ShowcaseLink[] {
  return parseStringList(value, /\n+/).map((line) => {
    const [label, href, kind] = line.split("|").map((part) => part.trim());

    if (!label || !href) {
      throw new Error("Additional links must use the format label|href|kind.");
    }

    return {
      label,
      href,
      kind: (kind || "docs") as ShowcaseLink["kind"]
    };
  });
}

export async function saveShowcaseEntryAction(
  _previousState: ShowcaseFormState = initialState,
  formData: FormData
): Promise<ShowcaseFormState> {
  try {
    const title = toText(formData.get("title"));
    const summary = toText(formData.get("summary"));
    const primaryLinkLabel = toText(formData.get("primaryLinkLabel"));
    const primaryLinkHref = toText(formData.get("primaryLinkHref"));
    const timezoneOffsetMinutes = parseTimezoneOffset(toText(formData.get("timezoneOffsetMinutes")) || "0");

    if (!title || !summary || !primaryLinkLabel || !primaryLinkHref) {
      throw new Error("Title, summary, and primary link are required.");
    }

    await saveShowcaseEntry({
      id: toText(formData.get("id")) || null,
      slug: toText(formData.get("slug")) || null,
      title,
      summary,
      body: parseStringList(toText(formData.get("body")), /\n+/),
      coverAsset: toText(formData.get("coverAsset")) || null,
      tags: parseStringList(toText(formData.get("tags")), ","),
      primaryLink: {
        label: primaryLinkLabel,
        href: primaryLinkHref,
        kind: (toText(formData.get("primaryLinkKind")) || "primary") as ShowcaseLink["kind"]
      },
      links: parseLinks(toText(formData.get("links"))),
      reviewStatus: (toText(formData.get("reviewStatus")) || "draft") as
        | "draft"
        | "pending"
        | "approved"
        | "changes_requested"
        | "rejected",
      scheduledAt: parseDateTimeValue(toText(formData.get("scheduledAt")), timezoneOffsetMinutes),
      publishedAt: parseDateTimeValue(toText(formData.get("publishedAt")), timezoneOffsetMinutes),
      origin: (toText(formData.get("origin")) || "editorial") as "editorial" | "imported" | "user_submission",
      createdBy: toText(formData.get("createdBy")) || null,
      submittedBy: toText(formData.get("submittedBy")) || null,
      authorLabel: toText(formData.get("authorLabel")) || null,
      sourceDiscoverItemId: toText(formData.get("sourceDiscoverItemId")) || null,
      featuredHome: parseBoolean(formData, "featuredHome"),
      featuredRadar: parseBoolean(formData, "featuredRadar"),
      featuredSubmitHub: parseBoolean(formData, "featuredSubmitHub"),
      displayOrder: Number.parseInt(toText(formData.get("displayOrder")) || "0", 10) || 0
    });

    revalidatePath("/");
    revalidatePath("/sources");
    for (const locale of SHOWCASE_REVALIDATE_LOCALES) {
      revalidatePath(`/${locale}`);
      revalidatePath(`/${locale}/sources`);
    }
    revalidatePath("/admin/showcase");

    return {
      status: "success",
      message: "Showcase entry saved."
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      status: "error",
      message
    };
  }
}
