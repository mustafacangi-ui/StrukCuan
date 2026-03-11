import { Link } from "react-router-dom";

export default function LegalFooter() {
  return (
    <footer className="mx-4 mt-8 mb-4 text-center">
      <p className="text-[10px] text-muted-foreground mb-2">
        © 2026 StrukCuan
      </p>
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-[10px]">
        <Link to="/privacy" className="text-muted-foreground hover:text-primary transition-colors">
          Privacy Policy
        </Link>
        <Link to="/terms" className="text-muted-foreground hover:text-primary transition-colors">
          Terms of Service
        </Link>
        <Link to="/promo-rules" className="text-muted-foreground hover:text-primary transition-colors">
          Promo Rules
        </Link>
        <Link to="/contact" className="text-muted-foreground hover:text-primary transition-colors">
          Contact
        </Link>
      </div>
    </footer>
  );
}
