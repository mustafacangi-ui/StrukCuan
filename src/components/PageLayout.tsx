import { ReactNode } from "react";
import { PREMIUM_PAGE_BACKGROUND } from "@/lib/designTokens";

interface PageLayoutProps {
  children: ReactNode;
  className?: string;
}

export function PageLayout({ children, className = "" }: PageLayoutProps) {
  return (
    <div className={`min-h-screen pb-28 max-w-[420px] mx-auto relative ${className}`}>
      <div className="fixed inset-0 -z-10" style={{ background: PREMIUM_PAGE_BACKGROUND }} />
      {children}
    </div>
  );
}

/** Radar premium card style */
export const CARD_STYLE = {
  background: "rgba(0,0,0,0.4)",
  border: "1px solid rgba(255,255,255,0.1)",
  boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
};
