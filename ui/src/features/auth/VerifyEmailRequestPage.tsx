// Path: ui/src/features/auth/VerifyEmailRequestPage.tsx
// Summary: Implements VerifyEmailRequestPage module logic.

import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';

import { requestEmailVerification } from '../../shared/api/auth';
import { track } from '../../shared/analytics';
import { SiteFooterLinks, RoenLogo } from '../../shared/ui';

export const VerifyEmailRequestPage = () => {
  const [searchParams] = useSearchParams();
  const initialEmail = useMemo(() => searchParams.get('email') ?? '', [searchParams]);
  const [email, setEmail] = useState(initialEmail);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationUrl, setVerificationUrl] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await requestEmailVerification(email);
      setVerificationUrl(response.verification_url);
      setSubmitted(true);
      track({
        name: 'email_verification_requested',
        props: { verification_link_available: Boolean(response.verification_url) },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Email verification request failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-ivory flex items-center justify-center p-6 font-sans">
      <div className="pointer-events-none absolute -top-32 -left-24 h-[500px] w-[500px] rounded-full bg-clay/8 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-16 h-[420px] w-[420px] rounded-full bg-amber/8 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', bounce: 0.28, duration: 0.5 }}
        className="relative w-full max-w-[460px] rounded-2xl border border-smoke/60 bg-white p-8 shadow-xl"
      >
        <Link to="/login" className="text-xs text-flint hover:text-espresso transition-colors">
          Back to sign in
        </Link>

        <div className="mb-7 mt-5 text-center">
          <RoenLogo variant="mark" className="mb-4" />
          <h1 className="font-display text-2xl font-bold text-espresso sm:text-3xl">Verify your email</h1>
          <p className="mt-1.5 text-sm text-flint">
            Enter your account email and we&apos;ll prepare a fresh verification link.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="verify-email" className="text-sm font-semibold text-espresso">
              Email
            </label>
            <input
              id="verify-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className="w-full rounded-xl border border-smoke bg-white px-4 py-3 text-sm transition-all duration-150 focus:border-amber focus:outline-none focus:ring-2 focus:ring-amber/40"
            />
          </div>

          {error ? (
            <div className="rounded-xl border border-danger/25 bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
              {error}
            </div>
          ) : null}

          {submitted ? (
            <div className="space-y-3 rounded-2xl border border-olive/20 bg-olive/10 px-4 py-4">
              <p className="text-sm font-semibold text-olive">Verification link ready</p>
              <p className="text-sm text-flint">
                If that email exists and still needs verification, a link is now available for the account.
              </p>
              {verificationUrl ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-flint">Verification link</p>
                  <div className="break-all rounded-xl border border-smoke bg-white px-3 py-2 text-sm text-flint">
                    {verificationUrl}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting || !email}
            className="w-full rounded-full bg-amber py-3 text-sm font-bold text-white shadow-lg shadow-amber/25 transition-colors duration-150 hover:bg-amber-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? 'Generating link…' : 'Generate verification link'}
          </button>
        </form>

        <SiteFooterLinks className="mt-6 flex flex-wrap items-center justify-center gap-4" />
      </motion.div>
    </div>
  );
};
