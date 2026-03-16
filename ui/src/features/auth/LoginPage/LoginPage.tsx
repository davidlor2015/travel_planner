import React, { useState } from "react";
import { login, register } from "../../../shared/api/auth";
import "./LoginPage.css";

interface LoginPageProps {
  onLoginSuccess: (token: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [confirmPassword, setConfirmPassword] = useState("");
  const isDisabled =
    isLoading ||
    !email ||
    !password ||
    (mode == "register" && !confirmPassword);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    if (mode == "register" && password != confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      if (mode == "register") {
        await register(email, password);
      }
      const data = await login(email, password);

      localStorage.setItem("access_token", data.access_token);

      onLoginSuccess(data.access_token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1 className="login-title">Travel Planner</h1>
        <p className="login-subtitle">
          {" "}
          {mode == "login"
            ? "Sign in to manage your trips"
            : "Create your account"}
        </p>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-field">
            <label htmlFor="email" className="login-label">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="login-input"
              placeholder="you@example.com"
            />
          </div>

          <div className="login-field">
            <label htmlFor="password" className="login-label">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="login-input"
              placeholder="Enter your password"
            />
            {mode === "register" && (
              <div className="login-field">
                <label htmlFor="confirmPassword" className="login-label">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="login-input"
                  placeholder="Re-enter your password"
                />
              </div>
            )}
          </div>

          {error && (
            <div className="login-error" role="alert">
              {error}
            </div>
          )}

          <button type="submit" disabled={isDisabled} className="login-button">
            {isLoading
              ? mode == "login"
                ? "Loggin in..."
                : "Creating account..."
              : mode == "login"
                ? "Log in"
                : "Sign Up"}
          </button>
          <p className="login-toggle">
            {mode == "login" ? (
              <>
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("register");
                    setError(null);
                  }}
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setError(null);
                  }}
                >
                  Log in
                </button>
              </>
            )}
          </p>
        </form>
      </div>
    </div>
  );
};
