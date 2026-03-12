import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function PromoRules() {
  return (
    <div className="min-h-screen bg-background max-w-[420px] mx-auto px-4 py-6 pb-12">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary mb-6"
      >
        <ArrowLeft size={18} />
        <span className="text-sm">Kembali</span>
      </Link>

      <h1 className="font-display text-2xl font-bold text-foreground mb-4">
        Promo Rules
      </h1>

      <div className="prose prose-invert prose-sm max-w-none text-muted-foreground space-y-4">
        <p className="text-sm leading-relaxed">
          Last updated: March 2026
        </p>
        <p className="text-sm leading-relaxed">
          These rules govern participation in StrukCuan promotions, lotteries, and reward programs.
        </p>
        <h2 className="text-base font-semibold text-foreground mt-6">Receipt Upload</h2>
        <p className="text-sm leading-relaxed">
          Each verified receipt earns 50 Cuan and 1 lottery ticket. Receipts must be from eligible stores (e.g., Indomaret, Alfamart) and show a valid purchase. Maximum 10 receipts per user per day.
        </p>
        <h2 className="text-base font-semibold text-foreground mt-6">Weekly Lottery</h2>
        <p className="text-sm leading-relaxed">
          Lotteries are drawn weekly. Five winners receive Rp 100,000 each. Winners are selected randomly from participants with at least one ticket. Odds depend on total tickets in the pool.
        </p>
        <h2 className="text-base font-semibold text-foreground mt-6">Promo Merah Bonus</h2>
        <p className="text-sm leading-relaxed">
          Receipts uploaded near active Promo Merah locations may qualify for 2x Cuan bonus. Eligibility is determined at our discretion based on location and timing.
        </p>
        <h2 className="text-base font-semibold text-foreground mt-6">Contact</h2>
        <p className="text-sm leading-relaxed">
          For questions about promo rules, please visit our Contact page.
        </p>
      </div>
    </div>
  );
}
