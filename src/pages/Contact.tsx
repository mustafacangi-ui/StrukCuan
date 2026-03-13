import { Link } from "react-router-dom";
import { ArrowLeft, Mail, MessageCircle } from "lucide-react";

export default function Contact() {
  return (
    <div className="min-h-screen max-w-[420px] mx-auto px-4 py-6 pb-12">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary mb-6"
      >
        <ArrowLeft size={18} />
        <span className="text-sm">Kembali</span>
      </Link>

      <h1 className="font-display text-2xl font-bold text-foreground mb-4">
        Contact
      </h1>

      <div className="prose prose-invert prose-sm max-w-none text-muted-foreground space-y-4">
        <p className="text-sm leading-relaxed">
          Have questions or feedback? We'd love to hear from you.
        </p>
        <div className="rounded-xl border border-border bg-card p-4 space-y-3 mt-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
              <Mail size={18} className="text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Email</p>
              <a href="mailto:support@strukcuan.com" className="text-sm text-primary hover:underline">
                support@strukcuan.com
              </a>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
              <MessageCircle size={18} className="text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">WhatsApp</p>
              <a href="https://wa.me/6281234567890" target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                +62 812 3456 7890
              </a>
            </div>
          </div>
        </div>
        <p className="text-sm leading-relaxed mt-6">
          We typically respond within 24–48 hours. For urgent matters, please use WhatsApp.
        </p>
      </div>
    </div>
  );
}
