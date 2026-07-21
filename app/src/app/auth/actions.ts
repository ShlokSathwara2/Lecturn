"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createServerSupabase } from "@/lib/supabase-server"

export async function signIn(formData: FormData) {
  const supabase = await createServerSupabase()
  const email = formData.get("email") as string

  if (!email) throw new Error("Email is required")

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  })

  if (error) throw error

  return { sent: true, email }
}

export async function signOut() {
  const supabase = await createServerSupabase()
  await supabase.auth.signOut()
  revalidatePath("/")
  redirect("/auth")
}
