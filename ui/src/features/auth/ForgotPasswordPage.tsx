import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

import { requestPasswordReset } from '../../shared/api/auth';
import { track } from '../../shared/analytics';
import { SiteFooterLinks, WaypointLogo } from '../../shared/ui';

export const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetUrl, setResetUrl] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await requestPasswordReset(email);
      setResetUrl(response.reset_url);
      setSubmitted(true);
      track({
        name: 'password_reset_requested',
        props: {
          reset_link_available: Boolean(response.reset_url),
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Password reset request failed.');
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
          <WaypointLogo variant="mark" className="w-12 h-12 mx-auto mb-3" />
          <h1 className="text-2xl sm:text-3xl font-bold text-espresso font-display">Reset password</h1>
          <p className="text-sm text-flint mt-1.5">
            Enter your account email and we&apos;ll generate a secure reset link.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="reset-email" className="text-sm font-semibold text-espresso">
              Email
            </label>
            <input
              id="reset-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className="w-full px-4 py-3 rounded-xl border border-smoke text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber/40 focus:border-amber transition-all duration-150"
            />
          </div>

          {error ? (
            <div className="px-4 py-3 rounded-xl bg-danger/10 border border-danger/25 text-danger text-sm font-medium">
              {error}
            </div>
          ) : null}

          {submitted ? (
            <div className="space-y-3 rounded-2xl border border-olive/20 bg-olive/10 px-4 py-4">
              <p className="text-sm font-semibold text-olive">Reset link ready</p>
              <p className="text-sm text-flint">
                If that email exists, a reset link is now available for the account.
              </p>
              {resetUrl ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-flint">Reset link</p>
                  <div className="rounded-xl border border-smoke bg-white px-3 py-2 text-sm text-flint break-all">
                    {resetUrl}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting || !email}
            className="w-full py-3 rounded-full bg-amber text-white font-bold text-sm shadow-lg shadow-amber/25 hover:bg-amber-dark transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSubmitting ? 'Generating link…' : 'Generate reset link'}
          </button>
        </form>

        <SiteFooterLinks className="mt-6 flex flex-wrap items-center justify-center gap-4" />
      </motion.div>
    </div>
  );
};
