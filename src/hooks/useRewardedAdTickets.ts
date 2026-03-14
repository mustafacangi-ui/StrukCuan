import { supabase } from "@/lib/supabase";

export async function grantTicket() {
  const { error } = await supabase.rpc("grant_ticket");
  if (error) {
    console.error("Grant ticket failed:", error);
    throw error;
  }
}
