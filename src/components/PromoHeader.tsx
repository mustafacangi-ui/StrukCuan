import { Tag, Receipt, ThumbsUp, Sparkles } from "lucide-react";

const PromoHeader = () => {
  return (
    <div className="relative mx-4 mt-4 overflow-hidden rounded-xl border border-primary/30 bg-gradient-to-br from-primary/20 via-primary/10 to-background p-5">
      {/* Animated decorative elements - shopping receipts, discounts, likes */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-25">
        <Receipt className="h-8 w-8 text-primary animate-pulse" />
        <Tag className="h-6 w-6 text-primary animate-pulse" style={{ animationDelay: "0.5s" }} />
      </div>
      <div className="absolute left-3 bottom-3 flex gap-1 opacity-25">
        <ThumbsUp className="h-5 w-5 text-primary animate-pulse" style={{ animationDelay: "0.3s" }} />
        <Sparkles className="h-5 w-5 text-primary animate-pulse" style={{ animationDelay: "0.6s" }} />
      </div>

      <div className="relative z-10 pr-16">
        <h1 className="font-display text-xl font-bold text-foreground">
          Promo Terbaik di Sekitarmu
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Temukan dan bagikan promo terbaik dari toko di sekitarmu.
        </p>
      </div>
    </div>
  );
};

export default PromoHeader;
