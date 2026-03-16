import { Camera } from "lucide-react";
import { useUser } from "@/contexts/UserContext";

interface FloatingActionButtonProps {
  onOpenScanner?: () => void;
}

const FloatingActionButton = ({ onOpenScanner }: FloatingActionButtonProps) => {
  const { isOnboarded, requireLogin } = useUser();

  const handleClick = () => {
    if (!isOnboarded) {
      requireLogin("camera");
      return;
    }
    onOpenScanner?.();
  };

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-20 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-green-500 shadow-lg transition-colors hover:bg-green-600 active:scale-95"
      aria-label="Scan receipt"
    >
      <Camera size={24} className="text-white" strokeWidth={2} />
    </button>
  );
};

export default FloatingActionButton;
