import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { useUserStats } from "@/hooks/useUserStats";
import { useUserPendingReceipts } from "@/hooks/useReceipts";

export default function UserDashboard() {
  const { user } = useUser();
  const userId = user?.phone;
  const navigate = useNavigate();

  const { data: stats } = useUserStats(userId);
  const { data: pendingReceipts = [] } = useUserPendingReceipts(userId);

  const cuan = stats?.cuan ?? user?.cuan ?? 0;
  const tiket = stats?.tiket ?? user?.tiket ?? 0;
  const pendingCount = pendingReceipts.length;

  return (
    <div className="mx-4 mt-3">
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-border bg-card p-2">
          <p className="text-[9px] text-muted-foreground">Cuan</p>
          <p className="font-display text-base font-bold text-foreground">
            {cuan.toLocaleString("id-ID")}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-2">
          <p className="text-[9px] text-muted-foreground">Tiket Undian</p>
          <p className="font-display text-base font-bold text-foreground">
            {tiket.toLocaleString("id-ID")}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-2">
          <p className="text-[9px] text-muted-foreground">Struk Pending</p>
          <p className="font-display text-base font-bold text-foreground">
            {pendingCount}
          </p>
        </div>
      </div>

      <button
        onClick={() => navigate("/receipts")}
        className="mt-2 w-full rounded-lg border border-border bg-secondary/60 py-1.5 text-[11px] font-semibold text-foreground"
      >
        View Receipts
      </button>
    </div>
  );
}

