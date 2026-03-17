/**
 * Merkezi ülke / dil / para birimi yapılandırması.
 * country_code (ISO 3166-1 alpha-2) ile filtrelenir.
 */

export type CountryCode = "ID" | "TR" | string;

export interface LocaleConfig {
  /** ISO 3166-1 alpha-2 */
  countryCode: string;
  /** Para birimi kodu (ISO 4217) */
  currency: string;
  /** Para birimi sembolü (örn. Rp, ₺) */
  currencySymbol: string;
  /** Intl.NumberFormat locale (örn. id-ID, tr-TR) */
  numberLocale: string;
  /** Dil kodu (i18n) */
  language: string;
  /** Varsayılan saat dilimi */
  timezone: string;
}

const LOCALE_MAP: Record<string, LocaleConfig> = {
  ID: {
    countryCode: "ID",
    currency: "IDR",
    currencySymbol: "Rp",
    numberLocale: "id-ID",
    language: "id",
    timezone: "Asia/Jakarta",
  },
  TR: {
    countryCode: "TR",
    currency: "TRY",
    currencySymbol: "₺",
    numberLocale: "tr-TR",
    language: "tr",
    timezone: "Europe/Istanbul",
  },
};

const DEFAULT_COUNTRY: CountryCode = "ID";

/**
 * Ülke koduna göre locale ayarlarını döndürür.
 */
export function getLocaleConfig(countryCode: CountryCode | null | undefined): LocaleConfig {
  const code = (countryCode ?? DEFAULT_COUNTRY).toUpperCase().slice(0, 2);
  return LOCALE_MAP[code] ?? LOCALE_MAP.ID;
}

/**
 * Para birimini formatlar (örn. Rp 100.000 veya ₺ 1.234,56)
 */
export function formatCurrency(
  amount: number,
  countryCode?: CountryCode | null,
  options?: Intl.NumberFormatOptions
): string {
  const cfg = getLocaleConfig(countryCode);
  const formatted = new Intl.NumberFormat(cfg.numberLocale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    ...options,
  }).format(amount);
  return `${cfg.currencySymbol} ${formatted}`;
}

/**
 * Tarihi ülke saat dilimine göre formatlar
 */
export function formatDate(
  date: Date | string | number,
  countryCode?: CountryCode | null,
  options?: Intl.DateTimeFormatOptions
): string {
  const cfg = getLocaleConfig(countryCode);
  const d = typeof date === "object" && date instanceof Date ? date : new Date(date);
  return new Intl.DateTimeFormat(cfg.numberLocale, {
    dateStyle: "medium",
    timeZone: cfg.timezone,
    ...options,
  }).format(d);
}

/**
 * Desteklenen ülke kodları
 */
export const SUPPORTED_COUNTRIES: CountryCode[] = Object.keys(LOCALE_MAP);
