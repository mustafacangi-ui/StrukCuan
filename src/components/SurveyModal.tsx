import { useEffect } from "react";
import { X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { USER_STATS_QUERY_KEY } from "@/hooks/useUserStats";

interface SurveyModalProps {
  clickUrl: string;
  onClose: () => void;
  userId: string | undefined;
}

/**
 * Modal with iframe for BitLabs survey.
 * On close: invalidate user stats so Cuan balance refreshes.
 */
export default function SurveyModal({ clickUrl, onClose, userId }: SurveyModalProps) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === "bitlabs_survey_complete" || e.data?.surveyComplete) {
        queryClient.invalidateQueries({ queryKey: [...USER_STATS_QUERY_KEY, userId] });
        onClose();
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onClose, queryClient, userId]);

  const handleClose = () => {
    queryClient.invalidateQueries({ queryKey: [...USER_STATS_QUERY_KEY, userId] });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#1a0f3c]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#1a0f3c]/95">
        <span className="text-sm font-medium text-white">Survey</span>
        <button
          type="button"
          onClick={handleClose}
          className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
          aria-label="Close"
        >
          <X size={20} />
        </button>
      </div>
      <div className="flex-1 min-h-0">
        <iframe
          src={clickUrl}
          title="BitLabs Survey"
          className="w-full h-full border-0"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
      </div>
    </div>
  );
}
