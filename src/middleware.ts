import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
    // Logic to determine if user is authenticated and beta tester
    // In a real app, verify session cookie via Firebase Admin (requires Edge-compatible auth or external API call)

    // For this Sandbox prototype, we'll check for a mock header or cookie
    // or simply allow pass-through but inject a header for the app to read.

    const response = NextResponse.next();

    // MOCK: Assume 'is_beta' is verified via session lookup
    // In production, you would parse the session cookie, check Firestore, and set this.

    // For now, ensuring routes are protected essentially
    if (request.nextUrl.pathname.startsWith('/dashboard')) {
        // Check auth...
    }

    return response;
}

export const config = {
    matcher: ['/dashboard/:path*', '/api/agents/:path*'],
};
