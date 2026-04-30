// Path: ui/src/features/auth/VerifyEmailPage.tsx
// Summary: Implements VerifyEmailPage module logic.

import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';

import { confirmEmailVerification, validateEmailVerificationToken } from '../../shared/api/auth';
import { track } from '../../shared/analytics';
import { SiteFooterLinks, RoenLogo } from '../../shared/ui';

export const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [validating, setValidating] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!token) {
        setValidating(false);
        setIsValidToken(false);
        return;
      }

      try {
        const status = await validateEmailVerificationToken(token);
        if (!cancelled) {
          setIsValidToken(status.valid);
          setEmail(status.email);
        }
      } catch {
        if (!cancelled) {
          setIsValidToken(false);
        }
      } finally {
        if (!cancelled) {
          setValidating(false);
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleConfirm = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await confirmEmailVerification(token);
      setIsComplete(true);
      track({ name: 'email_verification_completed' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Email verification failed.');
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
          <h1 className="font-display text-2xl font-bold text-espresso sm:text-3xl">Confirm your email</h1>
          <p className="mt-1.5 text-sm text-flint">
            Verifying your email protects your account and keeps shared trip access reliable.
          </p>
        </div>

        {validating ? (
          <div className="rounded-2xl border border-smoke bg-parchment/70 px-4 py-6 text-center text-sm text-flint">
            Validating verification link…
          </div>
        ) : !isValidToken ? (
          <div className="space-y-4 rounded-2xl border border-danger/20 bg-danger/10 px-4 py-5">
            <p className="text-sm font-semibold text-danger">This verification link is invalid or expired.</p>
            <Link to="/verify-email/request" className="inline-flex text-sm font-semibold text-amber hover:underline">
              Request a new verification link
            </Link>
          </div>
        ) : isComplete ? (
          <div className="space-y-4 rounded-2xl border border-olive/20 bg-olive/10 px-4 py-5">
            <p className="text-sm font-semibold text-olive">Email verified.</p>
            <Link to="/login" className="inline-flex text-sm font-semibold text-amber hover:underline">
              Continue to sign in
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl border border-smoke bg-parchment/60 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-flint">Account</p>
              <p className="mt-1 text-sm font-semibold text-espresso">{email ?? 'Pending account'}</p>
            </div>

            {error ? (
              <div className="rounded-xl border border-danger/25 bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
                {error}
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => void handleConfirm()}
              disabled={isSubmitting}
              className="w-full rounded-full bg-amber py-3 text-sm font-bold text-white shadow-lg shadow-amber/25 transition-colors duration-150 hover:bg-amber-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? 'Confirming…' : 'Confirm email'}
            </button>
          </div>
        )}

        <SiteFooterLinks className="mt-6 flex flex-wrap items-center justify-center gap-4" />
      </motion.div>
    </div>
  );
};
