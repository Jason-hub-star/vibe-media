"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import {
  DEFAULT_CANONICAL_LOCALE,
  DEFAULT_TARGET_LOCALES,
} from "@vibehub/content-contracts";
import { submitToolSubmission } from "@vibehub/backend";

export interface ToolSubmissionFormState {
  status: "idle" | "success" | "error";
  message: string | null;
}

const initialState: ToolSubmissionFormState = {
  status: "idle",
  message: null,
};

const SUBMIT_HUB_REVALIDATE_LOCALES = Array.from(
  new Set([DEFAULT_CANONICAL_LOCALE, ...DEFAULT_TARGET_LOCALES]),
);

function toText(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function parseTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export async function submitToolSubmissionAction(
  _previousState: ToolSubmissionFormState = initialState,
  formData: FormData,
): Promise<ToolSubmissionFormState> {
  try {
    const title = toText(formData.get("title"));
    const summary = toText(formData.get("summary"));
    const websiteUrl = toText(formData.get("websiteUrl"));
    const submitterEmail = toText(formData.get("submitterEmail"));

    if (!title || !summary || !websiteUrl || !submitterEmail) {
      throw new Error("Title, summary, website URL, and email are required.");
    }

    const requestHeaders = await headers();
    const forwardedFor = requestHeaders.get("x-forwarded-for");
    const realIp = requestHeaders.get("x-real-ip");
    const userAgent = requestHeaders.get("user-agent");

    const submission = await submitToolSubmission({
      title,
      slug: toText(formData.get("slug")) || null,
      summary,
      description: toText(formData.get("description")) || null,
      websiteUrl,
      githubUrl: toText(formData.get("githubUrl")) || null,
      demoUrl: toText(formData.get("demoUrl")) || null,
      docsUrl: toText(formData.get("docsUrl")) || null,
      tags: parseTags(toText(formData.get("tags"))),
      submitterEmail,
      submitterName: toText(formData.get("submitterName")) || null,
      honeypot: toText(formData.get("company")) || null,
      originIp: forwardedFor?.split(",")[0]?.trim() || realIp || null,
      userAgent,
      sourceLocale: DEFAULT_CANONICAL_LOCALE,
      targetLocales: [...DEFAULT_TARGET_LOCALES],
    });

    revalidatePath("/sources");
    for (const locale of SUBMIT_HUB_REVALIDATE_LOCALES) {
      revalidatePath(`/${locale}/sources`);
    }
    revalidatePath("/admin/submissions");

    return {
      status: "success",
      message:
        submission.status === "approved_for_listing"
          ? "Submission received and approved for listing."
          : "Submission received. If it passes automated screening, it will appear in Latest Submissions.",
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
