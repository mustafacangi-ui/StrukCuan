import { ArrowLeft } from "lucide-react";
import Header from "./Header";
import { StatsBar } from "./StatsBar";

interface PageHeaderProps {
  title: string;
  onBack?: () => void;
  showFullHeader?: boolean;
  onUploadReceipt?: () => void;
  onShareDiscount?: () => void;
}

/** Unified page header: back + title + stats bar (bilet/cuan/profil) */
export function PageHeader({
  title,
  onBack,
  showFullHeader = false,
  onUploadReceipt,
  onShareDiscount,
}: PageHeaderProps) {
  if (showFullHeader && onUploadReceipt && onShareDiscount) {
    return <Header onUploadReceipt={onUploadReceipt} onShareDiscount={onShareDiscount} />;
  }

  return (
    <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-3 border-b border-white/20">
      <div className="flex items-center gap-3 min-w-0">
        {onBack && (
          <button
            onClick={onBack}
            className="rounded-full bg-white/20 backdrop-blur p-2 hover:bg-white/30 transition-colors shrink-0"
          >
            <ArrowLeft size={18} className="text-white" />
          </button>
        )}
        <h1 className="font-display text-lg font-bold text-white truncate">{title}</h1>
      </div>
      <StatsBar compact />
    </div>
  );
}
