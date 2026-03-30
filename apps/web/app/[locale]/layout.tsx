import { notFound } from "next/navigation";

import { SetHtmlLang } from "@/components/SetHtmlLang";
import { isValidLocale, SUPPORTED_LOCALES } from "@/lib/i18n";

export function generateStaticParams() {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isValidLocale(locale)) notFound();

  return (
    <>
      <SetHtmlLang locale={locale} />
      {children}
    </>
  );
}
