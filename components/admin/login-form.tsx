"use client";

import { useId, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { SchoolOption } from "@/lib/api/types";

type FieldErrors = { email?: string; password?: string };

export function LoginForm() {
  const emailId = useId();
  const passwordId = useId();
  const emailErrorId = `${emailId}-error`;
  const passwordErrorId = `${passwordId}-error`;
  const [schools, setSchools] = useState<SchoolOption[] | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedEmail = email.trim();
    const nextErrors: FieldErrors = {};
    if (!trimmedEmail) {
      nextErrors.email = "Enter your school email address.";
    } else if (trimmedEmail.length > 320) {
      nextErrors.email = "Email addresses must be 320 characters or fewer.";
    } else if (!/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
      nextErrors.email = "Enter a valid email address.";
    }
    if (!password) {
      nextErrors.password = "Enter your password.";
    } else if (password.length < 8) {
      nextErrors.password = "Your password must be at least 8 characters.";
    } else if (password.length > 1024) {
      nextErrors.password = "Your password must be 1024 characters or fewer.";
    }

    setFieldErrors(nextErrors);
    setError(null);
    if (Object.keys(nextErrors).length > 0) return;

    setPending(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail, password }),
      });
      const payload = (await response.json().catch(() => null)) as {
        message?: string;
        schools?: SchoolOption[];
      } | null;
      if (!response.ok) {
        setError(payload?.message ?? "Sign in could not be completed.");
        return;
      }
      if (!Array.isArray(payload?.schools)) {
        setError("The sign-in service returned an invalid response.");
        return;
      }
      const choices = payload.schools;
      if (choices.length === 0) {
        setError("This account does not have an active school membership.");
        return;
      }
      if (choices.length === 1) {
        router.replace("/admin");
        router.refresh();
        return;
      }
      setSchools(choices);
    } catch {
      setError("The sign-in service could not be reached.");
    } finally {
      setPending(false);
    }
  }

  async function chooseSchool(schoolId: string) {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/school", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ schoolId }),
      });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        setError(payload.message ?? "This school could not be selected.");
        return;
      }
      router.replace("/admin");
      router.refresh();
    } catch {
      setError("The school selection service could not be reached.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="login-card">
      {schools && (
        <div className="login-choice-heading">
          <h1 id="login-title">Choose a school</h1>
          <p>Select the school website you want to manage.</p>
        </div>
      )}
      {error && (
        <p className="login-error" role="alert">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v5m0 3h.01" />
          </svg>
          {error}
        </p>
      )}
      {schools ? (
        <div className="school-choice">
          {schools.map((school) => (
            <button
              disabled={pending}
              key={school.id}
              onClick={() => chooseSchool(school.id)}
              type="button"
            >
              <span>{pending ? "Opening…" : school.name}</span>
              {!pending && (
                <span aria-hidden="true" className="school-choice-arrow">→</span>
              )}
            </button>
          ))}
        </div>
      ) : (
        <form className="login-form" noValidate onSubmit={signIn}>
          <div className="login-mobile-card-brand">
            <span aria-hidden="true" className="login-card-brand-mark">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M3 9.5 12 4l9 5.5-9 5.5-9-5.5Z" />
                <path d="M6.5 12v5.2c3.3 2.3 7.7 2.3 11 0V12M21 10v6" />
              </svg>
            </span>
            <span>
              <strong>School website</strong>
              <small>Content management</small>
            </span>
          </div>
          <div className="login-card-heading">
            <h1 id="login-title">Welcome back</h1>
            <p>
              Sign in with your school staff account to manage published pages, news and events.
            </p>
          </div>
          <div className="field">
            <label htmlFor={emailId}>School email</label>
            <div className="login-input-wrap">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
                <rect x="3.5" y="5" width="17" height="14" rx="2" />
                <path d="m4.5 7 7.5 6 7.5-6" />
              </svg>
              <input
                autoComplete="email"
                aria-describedby={fieldErrors.email ? emailErrorId : undefined}
                aria-invalid={Boolean(fieldErrors.email)}
                id={emailId}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setFieldErrors((current) => ({ ...current, email: undefined }));
                }}
                placeholder="name@school.org.uk"
                type="email"
                value={email}
              />
            </div>
            {fieldErrors.email && (
              <p className="login-field-error" id={emailErrorId}>
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 8v5m0 3h.01" />
                </svg>
                {fieldErrors.email}
              </p>
            )}
          </div>
          <div className="field">
            <label htmlFor={passwordId}>Password</label>
            <div className="login-input-wrap">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
                <rect x="4" y="10" width="16" height="11" rx="2" />
                <path d="M8 10V7a4 4 0 1 1 8 0v3m-4 5v2" />
              </svg>
              <input
                autoComplete="current-password"
                aria-describedby={fieldErrors.password ? passwordErrorId : undefined}
                aria-invalid={Boolean(fieldErrors.password)}
                id={passwordId}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setFieldErrors((current) => ({ ...current, password: undefined }));
                }}
                placeholder="Enter your password"
                type={showPassword ? "text" : "password"}
                value={password}
              />
              <button
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="password-visibility"
                onClick={() => setShowPassword((visible) => !visible)}
                type="button"
              >
                {showPassword ? (
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
                    <path d="m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                    <path d="M9.9 5.2A10.7 10.7 0 0 1 12 5c5.5 0 9 7 9 7a16 16 0 0 1-3 3.8M6.2 6.2C3.9 7.8 3 12 3 12s3.5 7 9 7c1.1 0 2.1-.3 3-.7" />
                  </svg>
                ) : (
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
                    <path d="M3 12s3.5-7 9-7 9 7 9 7-3.5 7-9 7-9-7-9-7Z" />
                    <circle cx="12" cy="12" r="2.5" />
                  </svg>
                )}
              </button>
            </div>
            {fieldErrors.password && (
              <p className="login-field-error" id={passwordErrorId}>
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 8v5m0 3h.01" />
                </svg>
                {fieldErrors.password}
              </p>
            )}
          </div>
          <button className="login-submit" disabled={pending} type="submit">
            {pending ? (
              <>
                <span aria-hidden="true" className="login-spinner" />
                Signing in…
              </>
            ) : (
              <>
                Sign in to content management
                <span aria-hidden="true">→</span>
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
