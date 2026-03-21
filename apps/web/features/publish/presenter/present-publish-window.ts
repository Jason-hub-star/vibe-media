export function presentPublishWindow(scheduledFor: string | null) {
  if (!scheduledFor) {
    return "Awaiting manual timing";
  }

  return `${scheduledFor.slice(5, 10)} ${scheduledFor.slice(11, 16)}`;
}
