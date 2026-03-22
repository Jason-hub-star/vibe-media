"use server";

import type { ShowcaseLink } from "@vibehub/content-contracts";

import { saveShowcaseEntry } from "@vibehub/backend";
import { revalidatePath } from "next/cache";

export interface ShowcaseFormState {
  status: "idle" | "success" | "error";
  message: string | null;
}

const initialState: ShowcaseFormState = {
  status: "idle",
  message: null
};

function toText(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function parseBoolean(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function parseDateTimeValue(value: string) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid date value for ${value}`);
  }
  return parsed.toISOString();
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
      scheduledAt: parseDateTimeValue(toText(formData.get("scheduledAt"))),
      publishedAt: parseDateTimeValue(toText(formData.get("publishedAt"))),
      origin: (toText(formData.get("origin")) || "editorial") as "editorial" | "imported" | "user_submission",
      createdBy: toText(formData.get("createdBy")) || null,
      submittedBy: toText(formData.get("submittedBy")) || null,
      authorLabel: toText(formData.get("authorLabel")) || null,
      sourceDiscoverItemId: toText(formData.get("sourceDiscoverItemId")) || null,
      featuredHome: parseBoolean(formData, "featuredHome"),
      featuredRadar: parseBoolean(formData, "featuredRadar"),
      displayOrder: Number.parseInt(toText(formData.get("displayOrder")) || "0", 10) || 0
    });

    revalidatePath("/");
    revalidatePath("/radar");
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
