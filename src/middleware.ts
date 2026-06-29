import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  const isAdminRoute = pathname.startsWith("/admin");
  const isPortalRoute = pathname.startsWith("/portal");
  const isAccountRoute = pathname.startsWith("/account");

  if (!isAdminRoute && !isPortalRoute && !isAccountRoute) {
    return NextResponse.next();
  }

  if (!session?.user) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = session.user.role;

  if (isAccountRoute) {
    return NextResponse.next();
  }

  if (isAdminRoute && role !== "ADMIN" && role !== "TEAM") {
    return NextResponse.redirect(new URL("/portal", req.url));
  }

  if (isPortalRoute && role !== "CLIENT") {
    return NextResponse.redirect(new URL("/admin", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*", "/portal/:path*", "/account/:path*"],
  runtime: "nodejs",
};
