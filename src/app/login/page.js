'use client';

import { useEffect, useState } from 'react';
import { landingForRole } from 'ccms-shared/nav';
import ErrorBanner from '../../components/ErrorBanner.js';
import { BRAND } from '../../lib/brand.js';
import { clearToken, refreshSession, revokeServerSession, signIn } from '../../lib/client/session.js';
import BrandMark from '../../components/BrandMark.js';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);

  // Already signed in (valid refresh cookie)? Go straight to the role's page.
  // After "Sign out" (?signed_out=1) never do that: finish signing out and show the form.
  useEffect(() => {
    let cancelled = false;
    if (new URLSearchParams(window.location.search).has('signed_out')) {
      clearToken();
      revokeServerSession().finally(() => {
        window.history.replaceState(null, '', window.location.pathname);
        if (!cancelled) setChecking(false);
      });
      return () => {
        cancelled = true;
      };
    }
    refreshSession()
      .then((user) => {
        if (cancelled) return;
        if (user) window.location.assign(landingForRole(user.role));
        else setChecking(false);
      })
      .catch(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const user = await signIn(email, password);
      window.location.assign(landingForRole(user.role));
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  if (checking) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Checking your session…</div>;
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-2">
      <div className="hidden bg-maroon-900 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3">
          <BrandMark size={48} />
          <div>
            <p className="font-bold leading-tight">{BRAND.campus}</p>
            <p className="text-sm text-white/70">{BRAND.system}</p>
          </div>
        </div>
        <div>
          <h1 className="font-serif text-4xl leading-tight text-white">{BRAND.fullName}</h1>
          <p className="mt-4 max-w-md text-white/75">Monitor how each office keeps the promises in the Citizen&apos;s Charter.</p>
        </div>
        <p className="text-xs text-white/50">Staff sign-in only.</p>
      </div>

      <div className="flex min-h-screen items-center justify-center px-4 py-10">
        <form onSubmit={onSubmit} className="card w-full max-w-md space-y-5 p-8" noValidate>
          <div>
            <h2 className="text-2xl">Sign in</h2>
            <p className="mt-1 text-sm text-slate-600">Use your CCMS account.</p>
          </div>
          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input id="email" type="email" autoComplete="username" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          </div>
          <div>
            <label className="label" htmlFor="password">
              Password
            </label>
            <input id="password" type="password" autoComplete="current-password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
          <ErrorBanner message={error} />
          <p className="text-center text-xs text-slate-500">Forgot your password? Ask a Super Admin to send you a reset link.</p>
        </form>
      </div>
    </div>
  );
}
