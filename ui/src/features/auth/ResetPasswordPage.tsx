import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';

import { confirmPasswordReset, validatePasswordResetToken } from '../../shared/api/auth';
import { track } from '../../shared/analytics';
import { SiteFooterLinks, WaypointLogo } from '../../shared/ui';

export const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [validating, setValidating] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!token) {
        setIsValidToken(false);
        setValidating(false);
        return;
      }

      try {
        const status = await validatePasswordResetToken(token);
        if (!cancelled) {
          setIsValidToken(status.valid);
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

  const disabled = useMemo(
    () => isSubmitting || !password || !confirmPassword,
    [confirmPassword, isSubmitting, password],
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      await confirmPasswordReset(token, password);
      setIsComplete(true);
      track({ name: 'password_reset_completed' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Password reset failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-ivory flex items-center justify-center p-6 font-sans">
      <div className="pointer-events-none absolute -top-32 -left-24 w-[500px] h-[500px] rounded-full bg-clay/8 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-16 w-[420px] h-[420px] rounded-full bg-amber/8 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', bounce: 0.28, duration: 0.5 }}
        className="relative w-full max-w-[440px] bg-white rounded-2xl shadow-xl border border-smoke/60 p-8"
      >
        <Link to="/login" className="text-xs text-flint hover:text-espresso transition-colors">
          Back to sign in
        </Link>

        <div className="text-center mb-7 mt-5">
          <WaypointLogo variant="mark" className="mb-4" />
          <h1 className="text-2xl sm:text-3xl font-bold text-espresso font-display">Choose a new password</h1>
          <p className="text-sm text-flint mt-1.5">
            This link is secure and only works while the reset token is still valid.
          </p>
        </div>

        {validating ? (
          <div className="rounded-2xl border border-smoke bg-parchment/70 px-4 py-6 text-center text-sm text-flint">
            Validating reset link…
          </div>
        ) : !isValidToken ? (
          <div className="space-y-4 rounded-2xl border border-danger/20 bg-danger/10 px-4 py-5">
            <p className="text-sm font-semibold text-danger">This reset link is invalid or expired.</p>
            <Link to="/forgot-password" className="inline-flex text-sm font-semibold text-amber hover:underline">
              Request a new reset link
            </Link>
          </div>
        ) : isComplete ? (
          <div className="space-y-4 rounded-2xl border border-olive/20 bg-olive/10 px-4 py-5">
            <p className="text-sm font-semibold text-olive">Password updated.</p>
            <Link to="/login" className="inline-flex text-sm font-semibold text-amber hover:underline">
              Continue to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="new-password" className="text-sm font-semibold text-espresso">
                New password
              </label>
              <input
                id="new-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                className="w-full px-4 py-3 rounded-xl border border-smoke text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber/40 focus:border-amber transition-all duration-150"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="confirm-password" className="text-sm font-semibold text-espresso">
                Confirm password
              </label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                className="w-full px-4 py-3 rounded-xl border border-smoke text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber/40 focus:border-amber transition-all duration-150"
              />
            </div>

            {error ? (
              <div className="px-4 py-3 rounded-xl bg-danger/10 border border-danger/25 text-danger text-sm font-medium">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={disabled}
              className="w-full py-3 rounded-full bg-amber text-white font-bold text-sm shadow-lg shadow-amber/25 hover:bg-amber-dark transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? 'Updating password…' : 'Update password'}
            </button>
          </form>
        )}

        <SiteFooterLinks className="mt-6 flex flex-wrap items-center justify-center gap-4" />
      </motion.div>
    </div>
  );
};
