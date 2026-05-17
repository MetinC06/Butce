import { NextResponse, type NextRequest } from 'next/server'

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isAuthPage = pathname.startsWith('/login')
  const isPublic = pathname.startsWith('/_next') || pathname.startsWith('/api') || pathname.includes('.')

  if (isPublic) return NextResponse.next()

  const hasSession = request.cookies.has('sb-lfbzgqqrkhlrkbbyptvu-auth-token') ||
    request.cookies.has('sb-access-token') ||
    [...request.cookies.getAll()].some(c => c.name.includes('supabase'))

  if (!hasSession && !isAuthPage) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (hasSession && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json).*)'],
}
