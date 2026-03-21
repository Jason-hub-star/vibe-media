import Image from "next/image";

import type { AssetSlot } from "@vibehub/content-contracts";

import { presentAssetSpec } from "../presenter/present-asset-spec";

export function AssetSlotList({ slots }: { slots: AssetSlot[] }) {
  return (
    <div className="admin-grid">
      {slots.map((slot) => (
        <article className="panel stack-tight" key={slot.id}>
          <Image alt={slot.name} className="slot-preview" height={240} src={slot.path} width={360} />
          <h3>{slot.name}</h3>
          <p className="muted">{presentAssetSpec(slot)}</p>
        </article>
      ))}
    </div>
  );
}
