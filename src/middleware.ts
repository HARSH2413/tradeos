import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"

import { isSupabaseConfigured } from "@/lib/supabase/config"
import type { Database } from "@/lib/supabase/types"

type CookieToSet = {
  name: string
  value: string
  options?: Parameters<NextResponse["cookies"]["set"]>[2]
}

const protectedRoutes = [
  "/dashboard",
  "/trades",
  "/calendar",
  "/strategies",
  "/rules",
  "/analytics",
  "/reports",
  "/settings",
  "/journal",
  "/analysis",
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isProtectedRoute = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )

  if (!isSupabaseConfigured()) {
    if (isProtectedRoute) {
      const url = request.nextUrl.clone()
      url.pathname = "/login"
      url.searchParams.set("redirectedFrom", pathname)
      return NextResponse.redirect(url)
    }

    return NextResponse.next({ request })
  }

  let response = NextResponse.next({
    request,
  })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })

          response = NextResponse.next({
            request,
          })

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // Use getUser() instead of getSession() to securely validate the token
  // with the Supabase Auth server and avoid security warnings.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("redirectedFrom", pathname)
    const redirectResponse = NextResponse.redirect(url)
    
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value)
    })
    
    return redirectResponse
  }

  if (user && pathname === "/login") {
    const url = request.nextUrl.clone()
    url.pathname = "/dashboard"
    url.search = ""
    const redirectResponse = NextResponse.redirect(url)
    
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value)
    })

    return redirectResponse
  }

  return response
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/journal/:path*",
    "/trades/:path*",
    "/calendar/:path*",
    "/strategies/:path*",
    "/rules/:path*",
    "/analytics/:path*",
    "/reports/:path*",
    "/analysis/:path*",
    "/settings/:path*",
    "/login",
  ],
}
