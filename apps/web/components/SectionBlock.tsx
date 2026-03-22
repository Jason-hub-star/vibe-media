import type { ReactNode } from "react";

export function SectionBlock({
  title,
  eyebrow,
  sectionId,
  children
}: {
  title: string;
  eyebrow: string;
  sectionId?: string;
  children: ReactNode;
}) {
  return (
    <section className="shell section-block" id={sectionId}>
      <div className="section-heading">
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
      </div>
      {children}
    </section>
  );
}
