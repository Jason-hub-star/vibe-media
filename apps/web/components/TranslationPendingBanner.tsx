/**
 * TranslationPendingBanner — 번역 미완료 시 영어 원문 fallback 알림.
 */

export function TranslationPendingBanner({ locale }: { locale: string }) {
  const messages: Record<string, string> = {
    es: "Este artículo aún no ha sido traducido. Estás viendo la versión original en inglés.",
  };

  const message =
    messages[locale] ??
    "This article is not yet available in your language. You are viewing the original English version.";

  return (
    <div className="translation-pending-banner" role="status">
      <span className="translation-pending-icon">🌐</span>
      <p className="translation-pending-text">{message}</p>
    </div>
  );
}
