import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import {
  usePendingDeals,
  useApproveDeal,
  useRejectDeal,
} from "@/hooks/useAdminDeals";

function useUserNicknames(userIds: string[]) {
  return useQuery({
    queryKey: ["user_nicknames", userIds.sort().join(",")],
    queryFn: async () => {
      if (userIds.length === 0) return new Map<string, string>();
      const { data } = await supabase
        .from("user_stats")
        .select("user_id, nickname")
        .in("user_id", userIds);
      const map = new Map<string, string>();
      (data ?? []).forEach((r: { user_id: string; nickname: string | null }) => {
        map.set(r.user_id, r.nickname || "User");
      });
      return map;
    },
    enabled: userIds.length > 0,
  });
}

export default function AdminDeals() {
  const { t } = useTranslation();
  const { data: deals = [], isLoading, error, refetch } = usePendingDeals();
  const approve = useApproveDeal();
  const reject = useRejectDeal();

  const userIds = [...new Set(deals.filter((d) => d.user_id).map((d) => d.user_id!))];
  const { data: nicknames = new Map() } = useUserNicknames(userIds);

  const formatDate = (dateStr: string): string => {
    const d = new Date(dateStr);
    const today = new Date();
    const isToday = d.toDateString() === today.toDateString();
    if (isToday) return t("admin.deals.today");
    return d.toLocaleDateString();
  };

  return (
    <div className="p-4">
      <div className="mb-4">
        <h2 className="font-display font-bold text-foreground">{t("admin.deals.title")}</h2>
        <p className="text-[10px] text-muted-foreground">
          {t("admin.deals.pendingCount", { count: deals.length })}
        </p>
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        {isLoading && (
          <div className="p-8 text-center text-muted-foreground">{t("admin.deals.loading")}</div>
        )}
        {error && (
          <div className="p-4 text-center text-destructive">{t("admin.deals.loadError")}</div>
        )}
        {!isLoading && !error && deals.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">{t("admin.deals.empty")}</div>
        )}
        {!isLoading && !error && deals.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase">
                    {t("admin.deals.colUser")}
                  </th>
                  <th className="text-left px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase">
                    {t("admin.deals.colProduct")}
                  </th>
                  <th className="text-left px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase">
                    {t("admin.deals.colStore")}
                  </th>
                  <th className="text-left px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase">
                    {t("admin.deals.colImage")}
                  </th>
                  <th className="text-left px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase">
                    {t("admin.deals.colDate")}
                  </th>
                  <th className="text-right px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase">
                    {t("admin.deals.colAction")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {deals.map((d) => (
                  <tr key={d.id} className="border-b border-border hover:bg-muted/20">
                    <td className="px-3 py-2">
                      <span className="text-xs text-muted-foreground truncate max-w-[80px] block">
                        {d.user_id ? nicknames.get(d.user_id) || d.user_id.slice(0, 8) : "-"}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <p className="text-sm font-medium text-foreground truncate max-w-[120px]">
                        {d.product_name || "-"}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {d.price != null ? `Rp ${d.price.toLocaleString("id-ID")}` : ""}
                        {d.discount != null ? ` · %${d.discount}` : ""}
                      </p>
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{d.store || "-"}</td>
                    <td className="px-3 py-2">
                      <div className="w-14 h-14 rounded-lg overflow-hidden bg-muted shrink-0">
                        {d.image ? (
                          <img
                            src={d.image}
                            alt=""
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground">
                            -
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-[11px] text-muted-foreground">
                      {d.created_at ? formatDate(d.created_at) : "-"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() =>
                            approve.mutate(d.id, {
                              onSuccess: () => {
                                toast.success(t("admin.toast.dealApproved"));
                                refetch();
                              },
                              onError: () => toast.error(t("admin.toast.dealActionFailed")),
                            })
                          }
                          disabled={approve.isPending || reject.isPending}
                          className="rounded-lg bg-primary px-3 py-1.5 text-[10px] font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50"
                        >
                          {approve.isPending ? "..." : t("common.approve")}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            reject.mutate(d.id, {
                              onSuccess: () => {
                                toast.success(t("admin.toast.dealRejected"));
                                refetch();
                              },
                              onError: () => toast.error(t("admin.toast.dealActionFailed")),
                            })
                          }
                          disabled={approve.isPending || reject.isPending}
                          className="rounded-lg border border-destructive/50 px-3 py-1.5 text-[10px] font-bold text-destructive hover:bg-destructive/10 disabled:opacity-50"
                        >
                          {reject.isPending ? "..." : t("common.reject")}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
