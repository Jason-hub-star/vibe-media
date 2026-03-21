import Image from "next/image";

export function PlaceholderArt({
  alt,
  src
}: {
  alt: string;
  src: string;
}) {
  return (
    <div className="placeholder-frame">
      <Image alt={alt} className="placeholder-image" height={720} src={src} width={960} />
    </div>
  );
}
