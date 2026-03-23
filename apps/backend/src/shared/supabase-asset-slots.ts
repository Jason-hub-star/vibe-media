import type { AssetSlot } from "@vibehub/content-contracts";

import { createSupabaseSql, getSupabaseDbUrl } from "./supabase-postgres";

interface SupabaseAssetSlotRow {
  id: string;
  name: string;
  slot_type: AssetSlot["type"];
  path: string;
  ratio: string;
  min_size: string;
  format: AssetSlot["spec"]["format"];
}

function canReadSupabase() {
  try {
    getSupabaseDbUrl();
    return true;
  } catch {
    return false;
  }
}

export async function listSupabaseAssetSlots() {
  if (!canReadSupabase()) return null;
  const sql = createSupabaseSql();

  try {
    const rows = await sql<SupabaseAssetSlotRow[]>`
      select
        id,
        name,
        slot_type,
        path,
        ratio,
        min_size,
        format
      from public.asset_slots
      order by name asc
    `;

    return rows.map(
      (row) =>
        ({
          id: row.id,
          name: row.name,
          type: row.slot_type,
          path: row.path,
          spec: {
            ratio: row.ratio,
            minSize: row.min_size,
            format: row.format
          }
        }) satisfies AssetSlot
    );
  } finally {
    await sql.end();
  }
}
