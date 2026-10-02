import { json, readJson, route } from 'ccms-shared';
import { login } from '../../../../lib/auth-service.js';
import { refreshCookie } from '../../../../lib/cookies.js';
import { getDb } from '../../../../lib/data-source.js';

export const dynamic = 'force-dynamic';

// POST /auth/login { email, password } -> access token (body) + refresh token (httpOnly cookie).
export const POST = route(async (request) => {
  const session = await login(await getDb(), await readJson(request));
  return json(
    { access_token: session.accessToken, token_type: 'Bearer', expires_in: session.expiresIn, user: session.user },
    200,
    { 'set-cookie': refreshCookie(session.refreshToken), 'cache-control': 'no-store' },
  );
});
