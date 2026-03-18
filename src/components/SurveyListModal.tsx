import { X } from "lucide-react";
import type { SurveyDisplay } from "@/hooks/useBitLabsSurveys";

interface SurveyListModalProps {
  open: boolean;
  onClose: () => void;
  surveys: SurveyDisplay[];
  isLoading: boolean;
  onSelectSurvey: (survey: SurveyDisplay) => void;
}

/**
 * Modal showing BitLabs survey list. Clicking a survey opens it (parent handles SurveyModal).
 */
export default function SurveyListModal({
  open,
  onClose,
  surveys,
  isLoading,
  onSelectSurvey,
}: SurveyListModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-purple-900">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/30 bg-purple-900/95">
        <span className="text-sm font-bold text-white">BitLabs Surveys</span>
        <button
          type="button"
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
          aria-label="Close"
        >
          <X size={20} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          <div className="text-center text-white/90 font-medium py-8">Memuat survei...</div>
        ) : surveys.length === 0 ? (
          <div className="text-center text-white/90 py-8">
            <p className="font-medium">Survei tidak tersedia saat ini.</p>
            <p className="text-sm mt-1 text-white/80">Silakan coba lagi nanti.</p>
          </div>
        ) : (
          surveys.map((survey) => (
            <button
              key={survey.id}
              type="button"
              onClick={() => onSelectSurvey(survey)}
              className="w-full rounded-2xl p-4 border border-white/30 bg-white/20 backdrop-blur-md flex items-center gap-3 text-left hover:bg-white/25 hover:border-white/40 transition-all"
            >
              <div className="shrink-0 w-12 h-12 rounded-xl bg-green-500/30 border border-green-400/40 flex items-center justify-center">
                <span className="text-lg">📋</span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-display font-bold text-white text-sm truncate">
                  {survey.title || "BitLabs Survey"}
                </h3>
                <p className="text-xs text-white/90 mt-0.5">
                  +{survey.rewardCuan} Cuan · {survey.durationMin} menit
                </p>
              </div>
              <span className="shrink-0 px-4 py-2 rounded-xl font-display font-bold text-xs text-white bg-gradient-to-r from-green-500 to-emerald-600 shadow-[0_0_12px_rgba(34,197,94,0.5)]">
                Mulai
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
