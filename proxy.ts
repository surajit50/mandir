import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    // Redirect unauthenticated users to login
    if (!token && !pathname.startsWith("/auth")) {
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
      authorized: ({ token }) => {
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    "/((?!auth|_next/static|_next/image|icon|apple-icon|icon\\.svg).*)",
  ],
};
