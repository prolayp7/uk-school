"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { SchoolOption } from "@/lib/api/types";

export function SchoolChooser() {
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    let active = true;
    fetch("/api/auth/schools")
      .then(async (response) => {
        const payload = (await response.json()) as {
          schools?: SchoolOption[];
          message?: string;
        };
        if (!response.ok) throw new Error(payload.message ?? "School choices are unavailable.");
        if (active) setSchools(payload.schools ?? []);
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(reason instanceof Error ? reason.message : "School choices are unavailable.");
        }
      });
    return () => {
      active = false;
    };
  }, []);

  async function chooseSchool(schoolId: string) {
    setPending(schoolId);
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
      setPending(null);
    }
  }

  return (
    <section aria-labelledby="school-choice-heading" className="admin-panel">
      <h2 id="school-choice-heading">Choose a school</h2>
      <p>Select which school website you want to manage.</p>
      {error && (
        <p className="form-message" role="alert">
          {error}
        </p>
      )}
      {schools.length === 0 && !error && <p>Loading available schools…</p>}
      <div className="school-choice">
        {schools.map((school) => (
          <button
            disabled={pending !== null}
            key={school.id}
            onClick={() => chooseSchool(school.id)}
            type="button"
          >
            {pending === school.id ? "Opening…" : school.name}
          </button>
        ))}
      </div>
    </section>
  );
}
