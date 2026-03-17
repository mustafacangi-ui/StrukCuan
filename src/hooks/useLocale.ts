import { useUser } from "@/contexts/UserContext";
import {
  getLocaleConfig,
  formatCurrency,
  formatDate,
  type LocaleConfig,
  type CountryCode,
} from "@/config/locale";

/**
 * Kullanıcının country_code'una göre locale ayarlarını döndürür.
 * Giriş yapmamışsa varsayılan (ID) kullanılır.
 */
export function useLocale(): LocaleConfig {
  const { user } = useUser();
  return getLocaleConfig(user?.countryCode ?? "ID");
}

/**
 * Para birimini kullanıcı ülkesine göre formatlar.
 */
export function useFormatCurrency() {
  const { user } = useUser();
  const countryCode = user?.countryCode ?? "ID";
  return (amount: number, options?: Intl.NumberFormatOptions) =>
    formatCurrency(amount, countryCode, options);
}

/**
 * Tarihi kullanıcı ülkesine göre formatlar.
 */
export function useFormatDate() {
  const { user } = useUser();
  const countryCode = user?.countryCode ?? "ID";
  return (date: Date | string | number, options?: Intl.DateTimeFormatOptions) =>
    formatDate(date, countryCode, options);
}

export { getLocaleConfig, formatCurrency, formatDate };
export type { LocaleConfig, CountryCode };
