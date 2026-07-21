import { createBrowserClient } from "@supabase/ssr"

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://jzemoqjpjmcrtpsnaztf.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_caqN4cLF_EEKnA0J_v1shQ_m1oiwYgy",
  )
}
