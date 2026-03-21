import type { AssetSlot } from "@vibehub/content-contracts";

export function presentAssetSpec(slot: AssetSlot) {
  return `${slot.spec.ratio} · ${slot.spec.minSize} · ${slot.spec.format}`;
}
