"use client";

import { useTransition } from "react";

import { retryExceptionAction } from "../action/retry-exception-action";

export function RetryExceptionButton({ exceptionId }: { exceptionId: string }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await retryExceptionAction({ exceptionId });
      if ("error" in result) {
        alert(result.error);
      }
    });
  }

  return (
    <button
      type="button"
      className="button-primary"
      disabled={isPending}
      onClick={handleClick}
    >
      {isPending ? "재시도 중…" : "재시도"}
    </button>
  );
}
