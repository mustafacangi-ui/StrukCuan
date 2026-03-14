import { supabase } from "@/lib/supabase";

export async function grantTicket() {
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    throw new Error("Please login");
  }
  const { error } = await supabase.rpc("grant_ticket");
  if (error) {
    console.error("Grant ticket failed:", error);
    throw error;
  }
}
