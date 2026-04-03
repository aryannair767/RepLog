// ============================================================
// src/middleware.ts
//
// Enforces strict authentication routing at the Edge.
// Unauthenticated users -> /login
// Incomplete profiles -> /complete-profile
// ============================================================

import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isAuth = !!token;
    const isProfileComplete = token?.isProfileComplete as boolean | undefined;

    const path = req.nextUrl.pathname;
    const isAuthPage = path.startsWith('/login');
    const isCompleteProfilePage = path.startsWith('/complete-profile');
    const isHomePage = path === '/';
    
    // GUEST MODE BYPASS
    const isGuest = req.nextUrl.searchParams.get('guest') === 'true';

    // If trying to access login page while authenticated
    if (isAuthPage) {
      if (isAuth) {
        if (!isProfileComplete) {
          return NextResponse.redirect(new URL('/complete-profile', req.url));
        }
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
      return null; // Let them see the login page
    }

    // If totally unauthenticated and NOT a guest and NOT on the home page, boot to login
    if (!isAuth && !isGuest && !isHomePage) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    // If authenticated but profile incomplete, force to complete-profile page (unless on home page)
    if (isAuth && !isProfileComplete && !isCompleteProfilePage && !isHomePage) {
      return NextResponse.redirect(new URL('/complete-profile', req.url));
    }

    // If profile is complete, don't let them go back to complete-profile
    if (isAuth && isProfileComplete && isCompleteProfilePage) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    return null;
  },
  {
    callbacks: {
      authorized: () => true, // Allows the middleware function to process every request
    },
  }
);

export const config = {
  matcher: [
    // Protect everything except auth API, static files, and icons
    "/((?!api/auth|_next/static|_next/image|favicon.ico|manifest.json|.*\\.png$).*)",
  ],
};
