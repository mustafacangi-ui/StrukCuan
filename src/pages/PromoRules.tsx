import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function PromoRules() {
  return (
    <div className="min-h-screen max-w-[420px] mx-auto px-4 py-6 pb-12">
      <Link
        to="/home"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary mb-6 transition-colors"
      >
        <ArrowLeft size={18} />
        <span className="text-sm">Back</span>
      </Link>

      <h1 className="font-display text-2xl font-bold text-foreground mb-4">
        Promotional Rules & Draw Mechanics
      </h1>

      <div className="prose prose-invert prose-sm max-w-none text-muted-foreground space-y-5">
        <p className="text-sm leading-relaxed font-semibold text-white/80">
          Last updated: April 2026
        </p>

        <section>
          <h2 className="text-base font-bold text-white mb-2">1. The Weekly Draw Overview</h2>
          <p className="text-sm leading-relaxed">
            StrukCuan distributes Rp50,000 Indomaret vouchers to 5 winners every single week. This process is 100% automated, utilizing a secure, randomized system generation algorithm (cron Sunday sweep) to pick draw codes. Participation does NOT constitute a guaranteed reward.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-white mb-2">2. Ticket Calculation & Entries</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Entry Accumulation:</strong> Every 10 total cumulative tickets earned (via receipt uploads, shakes, or surveys) automatically grants 1 physical Draw Code. You may hold multiple draw codes.</li>
            <li><strong>Single Win Per Code:</strong> While holding multiple draw codes increases objective mathematical odds, the same literal 6-digit draw code cannot be pulled twice in the same week.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-white mb-2">3. Claiming Limits & Rules</h2>
          <p className="text-sm leading-relaxed mb-2">
            Should you win the Weekly Draw, specific timelines and caveats apply:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-yellow-100/90">
            <li><strong>Contact Period:</strong> You will be notified via in-app alerts and/or email. You must provide delivery details or verify your identity within <strong>7 days</strong>. Failure to respond signifies total forfeiture.</li>
            <li><strong>Contact Details Responsibility:</strong> StrukCuan exclusively relies on the contact info stored in your profile. If you input a fake WhatsApp or email, StrukCuan is entirely relieved of delivery obligations.</li>
            <li><strong>Right to Redraw:</strong> We reserve the right to void the winner and redraw if forfeiture conditions are met or fraud is suspected post-draw.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-white mb-2">4. Disqualification Scenarios</h2>
          <p className="text-sm leading-relaxed">
            StrukCuan routinely audits winning accounts prior to final delivery. If an audited winning account contains digitally duplicated receipts, manipulated OCR bounds, or matches multi-account fingerprints, the win goes void immediately.
          </p>
        </section>

      </div>
    </div>
  );
}
