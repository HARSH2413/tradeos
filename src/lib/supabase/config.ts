export function isSupabaseConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    return false
  }

  try {
    const parsedUrl = new URL(url)
    return parsedUrl.protocol.startsWith("http") && anonKey.length > 40
  } catch {
    return false
  }
}
