import Script from "next/script";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
const ADSENSE_PUBLISHER_ID = process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID;

function resolveAdSenseClientId(value: string | undefined): string | null {
  const normalized = value?.trim();
  if (!normalized) return null;
  if (normalized.startsWith("ca-pub-")) return normalized;
  return `ca-pub-${normalized}`;
}

/** Google Analytics 4 — renders nothing if NEXT_PUBLIC_GA_ID is unset. */
export function Analytics() {
  const gaId = GA_ID?.trim();
  const adSenseClientId = resolveAdSenseClientId(ADSENSE_PUBLISHER_ID);
  if (!gaId && !adSenseClientId) return null;

  return (
    <>
      {gaId && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
            strategy="afterInteractive"
          />
          <Script id="ga4-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${gaId}');
            `}
          </Script>
        </>
      )}
      {adSenseClientId && (
        <Script
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adSenseClientId}`}
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      )}
    </>
  );
}
