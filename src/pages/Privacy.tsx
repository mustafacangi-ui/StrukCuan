import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background max-w-md mx-auto px-4 py-6 pb-12">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary mb-6"
      >
        <ArrowLeft size={18} />
        <span className="text-sm">Kembali</span>
      </Link>

      <h1 className="font-display text-2xl font-bold text-foreground mb-4">
        Privacy Policy
      </h1>

      <div className="prose prose-invert prose-sm max-w-none text-muted-foreground space-y-4">
        <p className="text-sm leading-relaxed">
          Last updated: March 2026
        </p>
        <p className="text-sm leading-relaxed">
          StrukCuan ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our mobile application.
        </p>
        <h2 className="text-base font-semibold text-foreground mt-6">Information We Collect</h2>
        <p className="text-sm leading-relaxed">
          We collect information you provide directly, including phone number, email, nickname, and receipt images you upload. We use this data to provide our services, verify receipts, and award points and tickets.
        </p>
        <h2 className="text-base font-semibold text-foreground mt-6">How We Use Your Information</h2>
        <p className="text-sm leading-relaxed">
          Your information is used to operate the StrukCuan service, process receipt uploads, manage your account, and communicate with you about promotions and lottery results.
        </p>
        <h2 className="text-base font-semibold text-foreground mt-6">Data Security</h2>
        <p className="text-sm leading-relaxed">
          We implement appropriate security measures to protect your personal information. Receipt data is stored securely and access is restricted to authorized personnel.
        </p>
        <h2 className="text-base font-semibold text-foreground mt-6">Contact Us</h2>
        <p className="text-sm leading-relaxed">
          For questions about this Privacy Policy, please contact us through the Contact page.
        </p>
      </div>
    </div>
  );
}
