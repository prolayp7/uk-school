"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function logout() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        setError(payload.message ?? "Sign out could not be confirmed.");
        return;
      }
      router.replace("/admin/login");
      router.refresh();
    } catch {
      setError("The sign-out service could not be reached.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="logout-wrap">
      <button
        aria-label={pending ? "Signing out" : "Sign out"}
        className="admin-button secondary"
        disabled={pending}
        onClick={logout}
        title={pending ? "Signing out" : "Sign out"}
        type="button"
      >
        <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
          <path d="M10 4H5v16h5M14 8l4 4-4 4m4-4H9" />
        </svg>
        <span>{pending ? "Signing out…" : "Sign out"}</span>
      </button>
      {error && <span role="alert">{error}</span>}
    </div>
  );
}
