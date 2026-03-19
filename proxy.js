import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isProtectedApiRoute = createRouteMatcher(['/api/(.*)'])

export default clerkMiddleware(async (auth, request) => {
  if (isProtectedApiRoute(request)) {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'A valid Clerk session token is required to access this endpoint.',
        },
        { status: 401 },
      )
    }
  }
})

export const config = {
  matcher: [
    /*
     * Match all request paths except static files and Next.js internals.
     * Always run for API routes.
     */
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
