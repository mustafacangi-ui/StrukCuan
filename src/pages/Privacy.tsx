import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function Privacy() {
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
        Privacy Policy
      </h1>

      <div className="prose prose-invert prose-sm max-w-none text-muted-foreground space-y-5">
        <p className="text-sm leading-relaxed font-semibold text-white/80">
          Last updated: April 2026
        </p>

        <section>
          <h2 className="text-base font-bold text-white mb-2">1. Indonesia Personal Data Protection Law (UU PDP 2022) compliance & Consent</h2>
          <p className="text-sm leading-relaxed mb-3">
            In compliance with Indonesia's Personal Data Protection Law (Undang-Undang Perlindungan Data Pribadi / UU PDP 2022), we require your explicit consent to process your data for the operation of StrukCuan.
          </p>
          <div className="p-4 rounded-xl relative overflow-hidden" 
               style={{ background: "rgba(155,92,255,0.08)", border: "1px solid rgba(155,92,255,0.2)" }}>
            <p className="text-xs italic text-white/80 mb-2 font-medium">Bilingual Consent Declaration / Deklarasi Persetujuan Dwi-bahasa:</p>
            <p className="text-xs text-white/70 mb-2">
              <strong>EN:</strong> By using StrukCuan and uploading receipts, I expressly consent to the collection, storage, and processing of my personal data, including demographic information, device data, location data, and receipt images (which may contain OCR-extracted location and transaction data) for moderation, AI training, fraud prevention, and promotional analytics. I understand my rights to request data deletion.
            </p>
            <hr className="border-white/10 my-2" />
            <p className="text-xs text-white/70">
              <strong>ID:</strong> <i>Dengan menggunakan StrukCuan dan mengunggah struk, saya secara tegas memberikan persetujuan untuk pengumpulan, penyimpanan, dan pemrosesan data pribadi saya, termasuk informasi demografis, data perangkat, data lokasi, dan gambar struk (yang mungkin berisi lokasi dan data transaksi yang diekstraksi oleh OCR) untuk keperluan moderasi, pelatihan AI, pencegahan penipuan, dan analitik promosi. Saya memahami hak saya untuk meminta penghapusan data.</i>
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-base font-bold text-white mb-2">2. Data We Collect and How We Use It</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Receipt Images & OCR Data:</strong> Store names, products, prices, temporal data, and geographic information extracted via AI. Used for moderation, receipt validation, network training, and market analytics.</li>
            <li><strong>Technical Footprint:</strong> Device IDs, IP Addresses, Geolocation data, and usage metrics to strictly prevent multi-accounting, referral fraud, and location-spoofing manipulation.</li>
            <li><strong>Account & Entry Data:</strong> Names, emails, and phone numbers are securely used to issue rewards, track ticket histories, and deliver lottery vouchers.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-white mb-2">3. User Responsibility & Sensitive Information</h2>
          <p className="text-sm leading-relaxed text-red-300/80 mb-2 font-medium">
            Users must verify they hold the right to share the receipt. Users must proactively obscure highly sensitive data (such as full 16-digit credit card numbers or highly personal identifying addresses) prior to upload. StrukCuan accepts no liability for third-party sensitive data willingly uploaded by the user.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-white mb-2">4. Data Retention Period</h2>
          <p className="text-sm leading-relaxed mb-2">
            Per strict internal and governmental audit requirements, we retain data categorically to protect the platform against historical fraud:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>10 Years:</strong> Receipt logs, financial fraud records, draw entry records, voucher payment records, audit trails, and notification logs.</li>
            <li><strong>5 Years:</strong> Raw OCR text, basic AI moderation decisions, and the hashed identification logs of deleted accounts specifically flagged for fraud prevention.</li>
            <li><strong>2 Years:</strong> Standard marketing and campaign analytics data.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-white mb-2">5. Data Deletion & Account Closure</h2>
          <p className="text-sm leading-relaxed">
            You retain the right to close your account and request erasure of your standard profile data at any time via the Settings menu. However, to prevent cyclic abuse, financial obligations, and fraud, records listed under the 5-to-10 year retention thresholds will be isolated but maintained as legally permitted.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-white mb-2">6. Contact Us</h2>
          <p className="text-sm leading-relaxed">
            For data inquiries, deletion requests, or questions regarding this policy, please reach out via our <Link to="/contact" className="text-primary hover:underline">Contact</Link> page.
          </p>
        </section>
      </div>
    </div>
  );
}
