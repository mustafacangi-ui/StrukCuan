import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function Terms() {
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
        Terms of Service
      </h1>

      <div className="prose prose-invert prose-sm max-w-none text-muted-foreground space-y-4">
        <p className="text-sm leading-relaxed">
          Last updated: March 2026
        </p>
        <p className="text-sm leading-relaxed">
          By using StrukCuan, you agree to these Terms of Service. Please read them carefully before using our application.
        </p>

        <h2 className="text-base font-semibold text-foreground mt-6">1. Age Requirement</h2>
        <p className="text-sm leading-relaxed">
          You must be at least 18 years old to use StrukCuan. By creating an account, you confirm that you meet this requirement.
        </p>

        <h2 className="text-base font-semibold text-foreground mt-6">2. Receipt Submission Rules</h2>
        <p className="text-sm leading-relaxed">
          Users must upload real supermarket receipts. Receipts must belong to the user and must be from the same day. Only supermarket receipts are accepted.
        </p>

        <h2 className="text-base font-semibold text-foreground mt-6">3. Daily Limit</h2>
        <p className="text-sm leading-relaxed">
          Users may upload a maximum of 3 receipts per day.
        </p>

        <h2 className="text-base font-semibold text-foreground mt-6">4. Fraud Protection</h2>
        <p className="text-sm leading-relaxed">
          Submitting fake, edited, duplicated, or manipulated receipts is strictly prohibited. Accounts involved in fraudulent activity may be suspended or permanently banned.
        </p>

        <h2 className="text-base font-semibold text-foreground mt-6">5. Fraud Investigation Rights</h2>
        <p className="text-sm leading-relaxed">
          StrukCuan reserves the right to investigate suspicious activity, including duplicate receipts or fraudulent submissions. Accounts involved in abuse may be suspended or permanently banned.
        </p>

        <h2 className="text-base font-semibold text-foreground mt-6">6. Admin Moderation Authority</h2>
        <p className="text-sm leading-relaxed">
          StrukCuan moderators have full authority to approve or reject receipts. Their decisions are final.
        </p>

        <h2 className="text-base font-semibold text-foreground mt-6">7. Reward Disclaimer</h2>
        <p className="text-sm leading-relaxed">
          Rewards (tickets and cuan) are granted only after manual verification by StrukCuan moderators. StrukCuan reserves the right to reject receipts that are invalid, unclear, duplicated, or suspected to be fraudulent.
        </p>

        <h2 className="text-base font-semibold text-foreground mt-6">8. No Guarantee of Rewards</h2>
        <p className="text-sm leading-relaxed">
          Participation in StrukCuan does not guarantee rewards, tickets, cuan, or lottery winnings.
        </p>

        <h2 className="text-base font-semibold text-foreground mt-6">9. Promotion Disclaimer</h2>
        <p className="text-sm leading-relaxed">
          Promotions, rewards, and lotteries may be modified, suspended, or cancelled at any time without prior notice.
        </p>

        <h2 className="text-base font-semibold text-foreground mt-6">10. Lottery Disclaimer</h2>
        <p className="text-sm leading-relaxed">
          Weekly lottery winners are selected randomly. Participation in the platform does not guarantee rewards.
        </p>

        <h2 className="text-base font-semibold text-foreground mt-6">11. Right to Modify Service</h2>
        <p className="text-sm leading-relaxed">
          StrukCuan reserves the right to modify, suspend, or terminate any feature, reward system, or promotion at any time.
        </p>

        <h2 className="text-base font-semibold text-foreground mt-6">12. Platform Liability</h2>
        <p className="text-sm leading-relaxed">
          StrukCuan is not responsible for technical issues, delays, service interruptions, or system errors that may affect reward distribution.
        </p>

        <h2 className="text-base font-semibold text-foreground mt-6">13. Reward Value Disclaimer</h2>
        <p className="text-sm leading-relaxed">
          Reward values shown in the StrukCuan application are promotional estimates and may change at any time. StrukCuan reserves the right to modify, adjust, or remove reward values, ticket distributions, or promotional mechanics without prior notice.
        </p>

        <h2 className="text-base font-semibold text-foreground mt-6">14. Receipt Ownership</h2>
        <p className="text-sm leading-relaxed">
          Users must only upload receipts from purchases they personally made. Uploading receipts belonging to other individuals, businesses, or third parties is strictly prohibited. StrukCuan reserves the right to reject receipts suspected of being collected, shared, purchased, or distributed between users.
        </p>

        <h2 className="text-base font-semibold text-foreground mt-6">15. Beta Service Notice</h2>
        <p className="text-sm leading-relaxed">
          StrukCuan is currently operating in a beta testing phase. Features, promotions, reward systems, and platform functionality may change or be updated during testing. Temporary service interruptions, technical issues, or data inconsistencies may occur during this period.
        </p>

        <h2 className="text-base font-semibold text-foreground mt-6">16. Contact</h2>
        <p className="text-sm leading-relaxed">
          For questions about these Terms, please visit our <Link to="/contact" className="text-primary hover:underline">Contact</Link> page.
        </p>
      </div>
    </div>
  );
}
