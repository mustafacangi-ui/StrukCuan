import { useEffect } from "react";

const REFERRAL_STORAGE_KEY = "referral_code";

/**
 * Captures ?r=REFERRALCODE from URL, stores in localStorage, and cleans the URL.
 */
const ReferralCapture = () => {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("r");
    if (!code || !code.trim()) return;

    localStorage.setItem(REFERRAL_STORAGE_KEY, code.trim().toUpperCase());
    params.delete("r");
    const newSearch = params.toString();
    const newPath = newSearch
      ? `${window.location.pathname}?${newSearch}`
      : window.location.pathname;
    window.history.replaceState({}, "", newPath);
  }, []);

  return null;
};

export default ReferralCapture;
export { REFERRAL_STORAGE_KEY };
