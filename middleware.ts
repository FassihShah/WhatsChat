export { default } from 'next-auth/middleware';

export const config = {
  matcher: ['/((?!login|api/auth|api/functions/whatsappWebhook|_next/static|_next/image|favicon.ico).*)'],
};
