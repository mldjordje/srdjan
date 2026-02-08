"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";

import AdminShell from "@/components/admin/AdminShell";
import { useLanguage, type Language } from "@/lib/useLanguage";

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
  const { language } = useLanguage();
  const text: Record<Language, Record<string, string>> = {
    sr: {
      apiMissing: "API nije podesen. Dodaj NEXT_PUBLIC_API_BASE_URL u .env.",
      adminMissing: "Dodaj NEXT_PUBLIC_ADMIN_KEY u .env da bi CMS radio.",
      bookingMinutesInvalid: "Unesi ispravan broj minuta za zakazivanje.",
      cancelMinutesInvalid: "Unesi ispravan broj minuta za otkazivanje.",
      cannotSave: "Ne mogu da sacuvam podesavanja.",
      saved: "Podesavanja su sacuvana.",
      genericError: "Doslo je do greske.",
      title: "Podesavanja",
      subtitle: "Upravljanje pravilima zakazivanja i otkazivanja",
      rulesTitle: "Pravila za termine",
      minBooking: "Minimalno minuta pre zakazivanja",
      minCancel: "Minimalno minuta pre otkazivanja",
      saving: "Cuvanje...",
      save: "Sacuvaj podesavanja",
    },
    en: {
      apiMissing: "API is not configured. Add NEXT_PUBLIC_API_BASE_URL to .env.",
      adminMissing: "Add NEXT_PUBLIC_ADMIN_KEY to .env so CMS can work.",
      bookingMinutesInvalid: "Enter valid booking lead time in minutes.",
      cancelMinutesInvalid: "Enter valid cancellation lead time in minutes.",
      cannotSave: "Unable to save settings.",
      saved: "Settings saved.",
      genericError: "Something went wrong.",
      title: "Settings",
      subtitle: "Manage booking and cancellation rules",
      rulesTitle: "Appointment rules",
      minBooking: "Minimum minutes before booking",
      minCancel: "Minimum minutes before cancellation",
      saving: "Saving...",
      save: "Save settings",
    },
    it: {
      apiMissing: "API non configurata. Aggiungi NEXT_PUBLIC_API_BASE_URL in .env.",
      adminMissing: "Aggiungi NEXT_PUBLIC_ADMIN_KEY in .env per usare il CMS.",
      bookingMinutesInvalid: "Inserisci un numero valido di minuti per la prenotazione.",
      cancelMinutesInvalid: "Inserisci un numero valido di minuti per la cancellazione.",
      cannotSave: "Impossibile salvare le impostazioni.",
      saved: "Impostazioni salvate.",
      genericError: "Si e verificato un errore.",
      title: "Impostazioni",
      subtitle: "Gestione regole di prenotazione e cancellazione",
      rulesTitle: "Regole appuntamenti",
      minBooking: "Minuti minimi prima della prenotazione",
      minCancel: "Minuti minimi prima della cancellazione",
      saving: "Salvataggio...",
      save: "Salva impostazioni",
    },
  };
  const t = text[language];
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
        message: t.apiMissing,
      });
      return;
    }

    if (!adminKey) {
      setStatus({
        type: "error",
        message: t.adminMissing,
      });
      return;
    }

    const minBooking = Number(formState.minBookingLeadMinutes);
    const minCancel = Number(formState.minCancelLeadMinutes);

    if (!Number.isFinite(minBooking) || minBooking < 0) {
      setStatus({
        type: "error",
        message: t.bookingMinutesInvalid,
      });
      return;
    }

    if (!Number.isFinite(minCancel) || minCancel < 0) {
      setStatus({
        type: "error",
        message: t.cancelMinutesInvalid,
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
        throw new Error(data?.message || t.cannotSave);
      }

      const settings = data?.settings ?? {};
      setFormState({
        minBookingLeadMinutes: String(settings.minBookingLeadMinutes ?? minBooking),
        minCancelLeadMinutes: String(settings.minCancelLeadMinutes ?? minCancel),
      });
      setStatus({ type: "success", message: t.saved });
    } catch (error) {
      const message = error instanceof Error ? error.message : t.genericError;
      setStatus({ type: "error", message });
    }
  };

  return (
    <AdminShell
      title={t.title}
      subtitle={t.subtitle}
    >
      <div className="admin-grid">
        <div className="admin-card">
          <h3>{t.rulesTitle}</h3>
          <form className="form-row" onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-row">
                <label htmlFor="minBookingLeadMinutes">
                  {t.minBooking}
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
                  {t.minCancel}
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
                {status.type === "loading" ? t.saving : t.save}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AdminShell>
  );
}
