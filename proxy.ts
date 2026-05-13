import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    // Redirect unauthenticated users to login, but allow access to / (home) and /auth
    if (!token && !pathname.startsWith("/auth") && pathname !== "/") {
      return NextResponse.redirect(new URL("/auth/login", req.url));
    }

    // Role-based access control
    const adminRoutes = ["/admin", "/dashboard/admin"];
    const accountantRoutes = ["/dashboard/accountant", "/reports"];
    const memberRoutes = ["/dashboard/member"];

    if (adminRoutes.some((route) => pathname.startsWith(route))) {
      if (token?.role !== "ADMIN") {
        return NextResponse.redirect(new URL("/unauthorized", req.url));
      }
    }

    if (accountantRoutes.some((route) => pathname.startsWith(route))) {
      if (token?.role !== "ACCOUNTANT" && token?.role !== "ADMIN") {
        return NextResponse.redirect(new URL("/unauthorized", req.url));
      }
    }

    if (memberRoutes.some((route) => pathname.startsWith(route))) {
      if (token?.role !== "MEMBER" && token?.role !== "ADMIN") {
        return NextResponse.redirect(new URL("/unauthorized", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        // Allow public access to home and auth pages
        if (pathname === "/" || pathname.startsWith("/auth")) {
          return true;
        }
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    "/((?!auth|_next/static|_next/image|favicon\\.ico|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.svg).*)",
  ],
};
