"use client";

import { PageFrame } from "@/components/PageFrame";
import { ErrorState } from "@/components/ErrorState";

export default function PublicError({ reset }: { reset: () => void }) {
  return (
    <PageFrame>
      <ErrorState message="Failed to load page." onRetry={reset} />
    </PageFrame>
  );
}
