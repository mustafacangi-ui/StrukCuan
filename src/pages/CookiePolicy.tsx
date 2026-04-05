import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function CookiePolicy() {
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
        Cookie Policy & Technical Tracking
      </h1>

      <div className="prose prose-invert prose-sm max-w-none text-muted-foreground space-y-5">
        <p className="text-sm leading-relaxed font-semibold text-white/80">
          Last updated: April 2026
        </p>

        <section>
          <h2 className="text-base font-bold text-white mb-2">1. What Are Cookies?</h2>
          <p className="text-sm leading-relaxed">
            Cookies and local storage data are small technical data units stored directly on your phone/browser. StrukCuan utilizes them to remember your login state, safeguard against fraud, and maintain persistent user sessions.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-white mb-2">2. How We Use Them</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Strictly Necessary (Authentication):</strong> Token storage to keep you logged into the application securely natively via Supabase.</li>
            <li><strong>Fraud Prevention (Heuristics):</strong> Device fingerprints, geographic anomaly flags, and IP logging stored locally measuring usage behavior strictly to detect multi-account farming, automated scripts, and malicious reward abuse.</li>
            <li><strong>Analytics:</strong> Usage paths to see which features (surveys, shakes, scans) cause crashes or lag.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-white mb-2">3. Disabling Tracking</h2>
          <p className="text-sm leading-relaxed">
            Because tracking cookies are primarily used for strict anti-fraud mechanisms tied to valid Receipt verification, heavily blocking essential StrukCuan local storage will render you unable to safely claim tickets or log in. 
          </p>
        </section>
      </div>
    </div>
  );
}
