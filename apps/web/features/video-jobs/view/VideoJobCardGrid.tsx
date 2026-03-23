import { AdminCard } from "@/components/AdminCard";
import { AdminCardGrid } from "@/components/AdminCardGrid";
import { presentVideoJobCard } from "../presenter/present-video-job-card";
import type { VideoJob } from "@vibehub/content-contracts";

export function VideoJobCardGrid({ items }: { items: VideoJob[] }) {
  return (
    <AdminCardGrid>
      {items.map((item) => {
        const card = presentVideoJobCard(item);
        return <AdminCard key={card.id} {...card} />;
      })}
    </AdminCardGrid>
  );
}
