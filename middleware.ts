export { default } from "next-auth/middleware";
export const config = { matcher: ["/dashboard/:path*", "/api/v1/:path*"] };
