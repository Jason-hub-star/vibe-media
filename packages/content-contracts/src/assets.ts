export type AssetSlotType = "hero" | "banner" | "sprite" | "logo" | "thumbnail";

export interface AssetReplacementSpec {
  ratio: string;
  minSize: string;
  format: "svg" | "webp" | "avif";
}

export interface AssetSlot {
  id: string;
  name: string;
  type: AssetSlotType;
  path: string;
  spec: AssetReplacementSpec;
}
