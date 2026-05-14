import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

const PUBLIC_ROUTES = [
  "/",
  "/about",
  "/contact",
];

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    const isPublicRoute = PUBLIC_ROUTES.some(
      (route) =>
        pathname === route ||
        pathname.startsWith(`${route}/`)
    );

    // Session expired
    if (token?.exp) {
      const currentTime = Math.floor(Date.now() / 1000);

      if (currentTime > token.exp) {
        const response = NextResponse.redirect(
          new URL("/auth/login", req.url)
        );

        response.cookies.delete(
          "next-auth.session-token"
        );

        response.cookies.delete(
          "__Secure-next-auth.session-token"
        );

        return response;
      }
    }

    // Login required
    if (
      !token &&
      !pathname.startsWith("/auth") &&
      !isPublicRoute
    ) {
      return NextResponse.redirect(
        new URL("/auth/login", req.url)
      );
    }

    return NextResponse.next();
  },

  {
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname;

        const isPublicRoute = PUBLIC_ROUTES.some(
          (route) =>
            pathname === route ||
            pathname.startsWith(`${route}/`)
        );

        if (
          isPublicRoute ||
          pathname.startsWith("/auth")
        ) {
          return true;
        }

        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};
