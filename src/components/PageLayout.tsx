import { ReactNode } from "react";

/** Radar theme: deep navy background */
const APP_GRADIENT = "bg-gradient-to-b from-[#0a0e14] via-[#0d1321] to-[#0a0e14]";

interface PageLayoutProps {
  children: ReactNode;
  className?: string;
}

export function PageLayout({ children, className = "" }: PageLayoutProps) {
  return (
    <div className={`min-h-screen pb-28 max-w-[420px] mx-auto relative ${className}`}>
      <div className={`fixed inset-0 -z-10 ${APP_GRADIENT}`} />
      {children}
    </div>
  );
}

/** Radar premium card style */
export const CARD_STYLE = {
  background: "linear-gradient(145deg, rgba(15, 23, 42, 0.95) 0%, rgba(15, 23, 42, 0.85) 100%)",
  border: "1px solid rgba(0, 255, 136, 0.12)",
  boxShadow: "0 4px 24px rgba(0, 0, 0, 0.4)",
};
