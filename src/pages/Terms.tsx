import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function Terms() {
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
        Terms of Service
      </h1>

      <div className="prose prose-invert prose-sm max-w-none text-muted-foreground space-y-5">
        <p className="text-sm leading-relaxed font-semibold text-white/80">
          Last updated: April 2026
        </p>
        <p className="text-sm leading-relaxed">
          By accessing or using StrukCuan, you unconditionally agree to these Terms of Service. If you do not agree with any part of these terms, you must discontinue use immediately.
        </p>

        <section>
          <h2 className="text-base font-bold text-white mb-2">1. Age & Eligibility</h2>
          <p className="text-sm leading-relaxed">
            You must be at least 18 years old or physically possess explicit parental/guardian consent to use StrukCuan and participate in draws.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-white mb-2">2. Verification, OCR, & Anti-Fraud</h2>
          <p className="text-sm leading-relaxed mb-2">
            StrukCuan utilizes automated AI OCR moderation combined with human review. You acknowledge and accept that:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>AI Moderation is NOT perfect; it may incorrectly reject or approve receipts.</li>
            <li>All final decisions regarding receipt validity remain strictly at the sole discretion of StrukCuan Administration.</li>
            <li>You grant StrukCuan full permission to process visual receipt data, extract text, and measure device/IP heuristics.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-white mb-2">3. Zero-Tolerance Abuse Policy</h2>
          <p className="text-sm leading-relaxed text-red-300/80 mb-2 font-medium">
            Any attempt to abuse the system will result in instant ban and confiscation of all rewards (even those previously approved).
          </p>
          <ul className="list-disc pl-5 space-y-1 text-red-200/90">
            <li><strong>Multi-Accounting:</strong> Opening multiple accounts through different phones, IPs, or emulators is strictly prohibited.</li>
            <li><strong>Receipt Forgery:</strong> Uploading manipulated (Photoshop), downloaded, digitally crafted, or repeatedly identically replicated physical receipts is illegal fraud.</li>
            <li><strong>Referral Fraud:</strong> Creating fake referred accounts to generate tickets will trigger automated chain-bans.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-white mb-2">4. Disclaimers of Reward & Liability</h2>
          <p className="text-sm leading-relaxed mb-2">
            StrukCuan makes NO GUARANTEES of winnings, and operates under limited liability parameters:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Tickets and Draw Entries strictly carry <strong>zero monetary cash value</strong>. They cannot be sold, exchanged, or converted into FIAT currency or bank transfers.</li>
            <li>We exclude all liability regarding third-party transaction downtime, Indomaret operational issues, or force majeure events disrupting weekly draws.</li>
            <li>Erroneous AI approvals later discovered to be fraudulent give us the right to revoke related tickets indefinitely.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-white mb-2">5. Modification of Campaign Terms</h2>
          <p className="text-sm leading-relaxed">
            StrukCuan reserves the right—without prior notice or permission—to suspend, alter, pause, reduce, or cease all promotional campaigns, payout ratios, shake win chances, survey outputs, and weekly variables.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-white mb-2">6. Contact</h2>
          <p className="text-sm leading-relaxed">
            Questions regarding these Terms should be sent via the <Link to="/contact" className="text-primary hover:underline">Contact</Link> page. Review community specific policies in our <Link to="/community-guidelines" className="text-primary hover:underline">Community Guidelines</Link>.
          </p>
        </section>
      </div>
    </div>
  );
}
