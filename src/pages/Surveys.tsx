import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ClipboardList, ChevronRight, Coins, ListTodo } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { useEffect } from "react";

export default function Surveys() {
  const navigate = useNavigate();
  const { isOnboarded } = useUser();

  // Redirect to Earn page with auto-open flag for backward compatibility
  useEffect(() => {
    if (isOnboarded) {
      navigate("/earn", { replace: true, state: { openSurveys: true } });
    }
  }, [isOnboarded, navigate]);

  // Show loading while redirecting
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#1a0f3c]">
      <div className="animate-spin h-6 w-6 rounded-full border-2 border-[#9b5cff] border-t-transparent" />
    </div>
  );
}
