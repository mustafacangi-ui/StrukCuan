import { supabase } from "@/lib/supabase";

/**
 * Convert 100 Cuan to 1 Ticket via Supabase RPC.
 */
export async function convertCuanToTicket(): Promise<{ ticketsAdded: number }> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    throw new Error("Please login");
  }

  const { data, error } = await supabase.rpc("convert_cuan_to_ticket");

  if (error) {
    if (error.message?.includes("INSUFFICIENT_CUAN")) {
      throw new Error("INSUFFICIENT_CUAN");
    }
    throw new Error(error.message ?? "Failed to convert");
  }

  const ticketsAdded = (data as { tickets_added?: number })?.tickets_added ?? 1;
  return { ticketsAdded };
}
