"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";

import AdminShell from "@/components/admin/AdminShell";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";
const adminKey = process.env.NEXT_PUBLIC_ADMIN_KEY || "";

type SettingsState = {
  minBookingLeadMinutes: string;
  minCancelLeadMinutes: string;
};

type StatusState = {
  type: "idle" | "loading" | "success" | "error";
  message?: string;
};

export default function AdminSettingsPage() {
  const [formState, setFormState] = useState<SettingsState>({
    minBookingLeadMinutes: "60",
    minCancelLeadMinutes: "60",
  });
  const [status, setStatus] = useState<StatusState>({ type: "idle" });

  useEffect(() => {
    if (!apiBaseUrl) {
      return;
    }

    let active = true;
    fetch(`${apiBaseUrl}/settings.php`, {
      headers: adminKey ? { "X-Admin-Key": adminKey } : undefined,
    })
      .then((response) => response.json())
      .then((data) => {
        if (!active) {
          return;
        }
        const settings = data?.settings ?? data ?? {};
        setFormState({
          minBookingLeadMinutes: String(settings.minBookingLeadMinutes ?? "60"),
          minCancelLeadMinutes: String(settings.minCancelLeadMinutes ?? "60"),
        });
      })
      .catch(() => {
        if (active) {
          setFormState((prev) => prev);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!apiBaseUrl) {
      setStatus({
        type: "error",
        message: "API nije podesen. Dodaj NEXT_PUBLIC_API_BASE_URL u .env.",
      });
      return;
    }

    if (!adminKey) {
      setStatus({
        type: "error",
        message: "Dodaj NEXT_PUBLIC_ADMIN_KEY u .env da bi CMS radio.",
      });
      return;
    }

    const minBooking = Number(formState.minBookingLeadMinutes);
    const minCancel = Number(formState.minCancelLeadMinutes);

    if (!Number.isFinite(minBooking) || minBooking < 0) {
      setStatus({
        type: "error",
        message: "Unesi ispravan broj minuta za zakazivanje.",
      });
      return;
    }

    if (!Number.isFinite(minCancel) || minCancel < 0) {
      setStatus({
        type: "error",
        message: "Unesi ispravan broj minuta za otkazivanje.",
      });
      return;
    }

    setStatus({ type: "loading" });

    try {
      const response = await fetch(`${apiBaseUrl}/settings.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Key": adminKey,
        },
        body: JSON.stringify({
          minBookingLeadMinutes: minBooking,
          minCancelLeadMinutes: minCancel,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Ne mogu da sacuvam podesavanja.");
      }

      const settings = data?.settings ?? {};
      setFormState({
        minBookingLeadMinutes: String(settings.minBookingLeadMinutes ?? minBooking),
        minCancelLeadMinutes: String(settings.minCancelLeadMinutes ?? minCancel),
      });
      setStatus({ type: "success", message: "Podesavanja su sacuvana." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Doslo je do greske.";
      setStatus({ type: "error", message });
    }
  };

  return (
    <AdminShell
      title="Podesavanja"
      subtitle="Upravljanje pravilima zakazivanja i otkazivanja"
    >
      <div className="admin-grid">
        <div className="admin-card">
          <h3>Pravila za termine</h3>
          <form className="form-row" onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-row">
                <label htmlFor="minBookingLeadMinutes">
                  Minimalno minuta pre zakazivanja
                </label>
                <input
                  id="minBookingLeadMinutes"
                  name="minBookingLeadMinutes"
                  className="input"
                  type="number"
                  min="0"
                  value={formState.minBookingLeadMinutes}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-row">
                <label htmlFor="minCancelLeadMinutes">
                  Minimalno minuta pre otkazivanja
                </label>
                <input
                  id="minCancelLeadMinutes"
                  name="minCancelLeadMinutes"
                  className="input"
                  type="number"
                  min="0"
                  value={formState.minCancelLeadMinutes}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
            {status.type !== "idle" && status.message && (
              <div className={`form-status ${status.type}`}>{status.message}</div>
            )}
            <div className="admin-actions">
              <button className="button" type="submit" disabled={status.type === "loading"}>
                {status.type === "loading" ? "Cuvanje..." : "Sacuvaj podesavanja"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AdminShell>
  );
}
