import i18n from "@/i18n";

const COUNTRY_TO_LANG: Record<string, string> = {
  ID: "id",
  DE: "de",
  TR: "tr",
};

/**
 * Ülkeye göre selamlama metni (i18n ile uyumlu)
 */
export function getGreetingForCountry(countryCode: string | null | undefined): string {
  const code = (countryCode ?? "ID").toUpperCase().slice(0, 2);
  const lang = COUNTRY_TO_LANG[code] ?? "en";
  return i18n.t("greeting", { lng: lang });
}

/**
 * Kısa selamlama (Header "Hello," yerine)
 */
export function getHelloForCountry(countryCode: string | null | undefined): string {
  const code = (countryCode ?? "ID").toUpperCase().slice(0, 2);
  const lang = COUNTRY_TO_LANG[code] ?? "en";
  return i18n.t("auth.hello", { lng: lang });
}

/**
 * Hoş geldin (giriş yapmamış kullanıcı için)
 */
export function getWelcomeForCountry(countryCode: string | null | undefined): string {
  const code = (countryCode ?? "ID").toUpperCase().slice(0, 2);
  const lang = COUNTRY_TO_LANG[code] ?? "en";
  return i18n.t("auth.welcome", { lng: lang });
}
