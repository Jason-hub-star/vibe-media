import { parseBriefSections } from "../presenter/parse-brief-sections";

interface BriefBodySectionsProps {
  body: string[];
}

export function BriefBodySections({ body }: BriefBodySectionsProps) {
  const sections = parseBriefSections(body);

  return (
    <>
      {sections.map((section, i) => (
        <div className="brief-section" key={i}>
          {section.heading && (
            <h3 className="brief-section-heading">{section.heading}</h3>
          )}
          {section.paragraphs.map((p, paragraphIndex) => (
            <p key={`brief-section-${i}-paragraph-${paragraphIndex}`}>{p}</p>
          ))}
        </div>
      ))}
    </>
  );
}
