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
        <span className="text-sm">Kembali</span>
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
        <h2 className="text-base font-semibold text-foreground mt-6">Eligibility</h2>
        <p className="text-sm leading-relaxed">
          You must be at least 18 years old and reside in Indonesia to use StrukCuan. By creating an account, you confirm that you meet these requirements.
        </p>
        <h2 className="text-base font-semibold text-foreground mt-6">Acceptable Use</h2>
        <p className="text-sm leading-relaxed">
          You agree to upload only genuine receipts from your own purchases. Fraudulent or manipulated receipts may result in account suspension and forfeiture of points and tickets.
        </p>
        <h2 className="text-base font-semibold text-foreground mt-6">Points and Prizes</h2>
        <p className="text-sm leading-relaxed">
          Points (Cuan) and lottery tickets are awarded at our discretion based on receipt verification. We reserve the right to modify reward structures and lottery rules.
        </p>
        <h2 className="text-base font-semibold text-foreground mt-6">Contact</h2>
        <p className="text-sm leading-relaxed">
          For questions about these Terms, please visit our Contact page.
        </p>
      </div>
    </div>
  );
}
