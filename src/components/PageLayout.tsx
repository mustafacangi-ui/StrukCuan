import { ReactNode } from "react";

/** Global gradient background - StrukCuan brand (fuchsia top → purple bottom) */
const APP_GRADIENT = "bg-gradient-to-b from-[#ff6ec4] via-[#c94fd6] to-[#8e2de2]";

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

/** Content card style - dark translucent, matches Invite/Cuan */
export const CARD_STYLE = {
  background: "rgba(0,0,0,0.45)",
  border: "1px solid rgba(255,255,255,0.15)",
};
