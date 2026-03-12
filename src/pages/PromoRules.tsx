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
        <span className="text-sm">Back</span>
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

        <h2 className="text-base font-semibold text-foreground mt-6">Receipt Rules</h2>
        <ul className="list-disc pl-5 text-sm leading-relaxed space-y-1">
          <li>Only supermarket receipts are accepted</li>
          <li>Receipts must be from the same day</li>
          <li>Maximum 3 receipts per day</li>
          <li>Rewards are granted only after manual approval</li>
        </ul>

        <h2 className="text-base font-semibold text-foreground mt-6">Receipt Ownership</h2>
        <p className="text-sm leading-relaxed">
          Users must only upload receipts from purchases they personally made. Uploading receipts belonging to other individuals, businesses, or third parties is strictly prohibited. StrukCuan reserves the right to reject receipts suspected of being collected, shared, purchased, or distributed between users.
        </p>

        <h2 className="text-base font-semibold text-foreground mt-6">Tickets and Cuan</h2>
        <p className="text-sm leading-relaxed">
          Each approved receipt earns Cuan (points) and lottery tickets. The exact amounts are determined by StrukCuan moderators during manual verification. Tickets enter you into the weekly lottery draw.
        </p>

        <h2 className="text-base font-semibold text-foreground mt-6">Weekly Lottery</h2>
        <p className="text-sm leading-relaxed">
          Lotteries are drawn weekly. Winners are selected randomly from participants with tickets. Participation does not guarantee rewards.
        </p>

        <h2 className="text-base font-semibold text-foreground mt-6">Contact</h2>
        <p className="text-sm leading-relaxed">
          For questions about promo rules, please visit our <Link to="/contact" className="text-primary hover:underline">Contact</Link> page.
        </p>
      </div>
    </div>
  );
}
