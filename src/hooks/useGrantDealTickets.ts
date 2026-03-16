import { supabase } from "@/lib/supabase";

/**
 * Grants +2 tickets for Red Label (deal) sharing.
 * Calls grant_deal_tickets RPC.
 */
export async function grantDealTickets() {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    throw new Error("Please login");
  }

  const { data, error } = await supabase.rpc("grant_deal_tickets");

  if (error) {
    console.error("[grantDealTickets] RPC failed:", error);
    throw new Error(error.message ?? "Failed to grant tickets");
  }

  return data;
}
