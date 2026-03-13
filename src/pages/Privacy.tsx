import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function Privacy() {
  return (
    <div className="min-h-screen max-w-[420px] mx-auto px-4 py-6 pb-12">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary mb-6"
      >
        <ArrowLeft size={18} />
        <span className="text-sm">Back</span>
      </Link>

      <h1 className="font-display text-2xl font-bold text-foreground mb-4">
        Privacy Policy
      </h1>

      <div className="prose prose-invert prose-sm max-w-none text-muted-foreground space-y-4">
        <p className="text-sm leading-relaxed">
          Last updated: March 2026
        </p>
        <p className="text-sm leading-relaxed">
          StrukCuan ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our application.
        </p>

        <h2 className="text-base font-semibold text-foreground mt-6">Information We Collect</h2>
        <p className="text-sm leading-relaxed">
          We collect the following data:
        </p>
        <ul className="list-disc pl-5 text-sm leading-relaxed space-y-1">
          <li>Email address</li>
          <li>Uploaded receipt images</li>
          <li>Account activity</li>
          <li>Reward activity</li>
        </ul>

        <h2 className="text-base font-semibold text-foreground mt-6">Receipt Images</h2>
        <p className="text-sm leading-relaxed">
          Receipt images are stored for verification and fraud prevention. By uploading a receipt, you grant StrukCuan permission to store and review the receipt image for verification purposes.
        </p>

        <h2 className="text-base font-semibold text-foreground mt-6">Data Sale</h2>
        <p className="text-sm leading-relaxed">
          We do not sell your personal data to third parties.
        </p>

        <h2 className="text-base font-semibold text-foreground mt-6">Indonesia Personal Data Protection</h2>
        <p className="text-sm leading-relaxed">
          We comply with the Undang-Undang Perlindungan Data Pribadi (UU PDP 2022) and applicable Indonesian data protection laws. Your data is stored securely and used only for service operation and fraud prevention.
        </p>

        <h2 className="text-base font-semibold text-foreground mt-6">Data Security</h2>
        <p className="text-sm leading-relaxed">
          We implement appropriate security measures to protect your personal information. Receipt data is stored securely and access is restricted to authorized personnel.
        </p>

        <h2 className="text-base font-semibold text-foreground mt-6">Contact Us</h2>
        <p className="text-sm leading-relaxed">
          For questions about this Privacy Policy, please contact us through our <Link to="/contact" className="text-primary hover:underline">Contact</Link> page.
        </p>
      </div>
    </div>
  );
}
