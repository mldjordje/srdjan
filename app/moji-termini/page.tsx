"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";

type Appointment = {
  id: string;
  clientName?: string;
  serviceName: string;
  date: string;
  time: string;
  status?: string;
};

type ClientProfile = {
  name: string;
  phone: string;
  email: string;
  token: string;
};

type StatusState = {
  type: "idle" | "loading" | "success" | "error";
  message?: string;
};

const statusLabels: Record<string, string> = {
  pending: "Na cekanju",
  confirmed: "Potvrdjen",
  completed: "Zavrsen",
  cancelled: "Otkazan",
  no_show: "Nije dosao",
};

const formatLongDate = (value: string) => {
  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat("sr-RS", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
};

const normalizeTime = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  const match = trimmed.match(/^(\d{1,2}):(\d{2})/);
  if (!match) {
    return trimmed;
  }
  return `${match[1].padStart(2, "0")}:${match[2]}`;
};

const buildDateTime = (appointment: Appointment) => {
  const time = normalizeTime(appointment.time) || "00:00";
  return new Date(`${appointment.date}T${time}:00`);
};

export default function MyAppointmentsPage() {
  const [client, setClient] = useState<ClientProfile | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [status, setStatus] = useState<StatusState>({ type: "idle" });
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);
  const [cancelStatus, setCancelStatus] = useState<StatusState>({ type: "idle" });

  useEffect(() => {
    const token = localStorage.getItem("db_client_token");
    if (!token) {
      return;
    }

    const name = localStorage.getItem("db_client_name") || "";
    const phone = localStorage.getItem("db_client_phone") || "";
    const email = localStorage.getItem("db_client_email") || "";

    const profile = { name, phone, email, token };
    setClient(profile);
    fetchAppointments(profile.token);
  }, []);

  const fetchAppointments = async (token: string) => {
    if (!apiBaseUrl) {
      return;
    }

    setStatus({ type: "loading" });
    try {
      const response = await fetch(
        `${apiBaseUrl}/appointments.php?clientToken=${encodeURIComponent(token)}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Ne mogu da preuzmem termine.");
      }

      const items = Array.isArray(data.appointments) ? data.appointments : [];
      items.sort((a: Appointment, b: Appointment) =>
        `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)
      );
      setAppointments(items);
      setStatus({ type: "idle" });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Doslo je do greske.";
      setStatus({ type: "error", message });
    }
  };

  const handleCancelRequest = (appointment: Appointment) => {
    setCancelTarget(appointment);
    setCancelStatus({ type: "idle" });
  };

  const handleCancelClose = () => {
    setCancelTarget(null);
    setCancelStatus({ type: "idle" });
  };

  const handleCancelConfirm = async () => {
    if (!cancelTarget || !client) {
      return;
    }

    if (!apiBaseUrl) {
      setCancelStatus({
        type: "error",
        message: "API nije podesen. Dodaj NEXT_PUBLIC_API_BASE_URL u .env.",
      });
      return;
    }

    setCancelStatus({ type: "loading" });

    try {
      const response = await fetch(`${apiBaseUrl}/appointments.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "cancel",
          id: cancelTarget.id,
          clientToken: client.token,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Ne mogu da otkazem termin.");
      }

      setCancelStatus({ type: "success", message: "Termin je otkazan." });
      setCancelTarget(null);
      fetchAppointments(client.token);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Doslo je do greske.";
      setCancelStatus({ type: "error", message });
    }
  };
  const handleLogout = () => {
    localStorage.removeItem("db_client_token");
    localStorage.removeItem("db_client_name");
    localStorage.removeItem("db_client_phone");
    localStorage.removeItem("db_client_email");
    setClient(null);
    setAppointments([]);
    setStatus({ type: "idle" });
  };

  const { upcoming, past } = useMemo(() => {
    const now = new Date();
    const upcomingList: Appointment[] = [];
    const pastList: Appointment[] = [];

    appointments.forEach((appointment) => {
      const dateTime = buildDateTime(appointment);
      if (dateTime >= now) {
        upcomingList.push(appointment);
      } else {
        pastList.push(appointment);
      }
    });

    upcomingList.sort(
      (a, b) => buildDateTime(a).getTime() - buildDateTime(b).getTime()
    );
    pastList.sort(
      (a, b) => buildDateTime(b).getTime() - buildDateTime(a).getTime()
    );

    return { upcoming: upcomingList, past: pastList };
  }, [appointments]);

  if (!client) {
    return (
      <div className="page">
        <header className="nav">
          <div className="container nav-inner">
            <Link className="brand" href="/">
              <div className="brand-mark">
                <Image
                  src="/logo.png"
                  alt="Doctor Barber"
                  width={36}
                  height={36}
                />
              </div>
              <div className="brand-title">
                <span>Doctor Barber</span>
                <span>Barber Studio</span>
              </div>
            </Link>
            <nav className="nav-links">
              <Link href="/">Pocetna</Link>
              <Link href="/#booking">Zakazi termin</Link>
              <Link href="/login">Prijava</Link>
            </nav>
          </div>
        </header>

        <main className="appointments-layout container">
          <div className="booking-locked">
            <div>
              <h3>Prijava je obavezna</h3>
              <p>Prijavi se da bi video svoje termine.</p>
            </div>
            <div className="hero-actions">
              <Link className="button" href="/login">
                Prijava
              </Link>
              <Link className="button outline" href="/register">
                Registracija
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="nav">
        <div className="container nav-inner">
          <Link className="brand" href="/">
            <div className="brand-mark">
              <Image
                src="/logo.png"
                alt="Doctor Barber"
                width={36}
                height={36}
              />
            </div>
            <div className="brand-title">
              <span>Doctor Barber</span>
              <span>Barber Studio</span>
            </div>
          </Link>
          <nav className="nav-links">
            <Link href="/">Pocetna</Link>
            <Link href="/#booking">Zakazi termin</Link>
            <button className="button small ghost" type="button" onClick={handleLogout}>
              Odjava
            </button>
          </nav>
        </div>
      </header>

      <main className="appointments-layout container">
        <div className="appointments-header">
          <div>
            <h1>Moji termini</h1>
            <p>Pregled svih zakazanih termina i istorije.</p>
          </div>
          <div className="appointments-actions">
            <button
              className="button small ghost"
              type="button"
              onClick={() => fetchAppointments(client.token)}
              disabled={status.type === "loading"}
            >
              {status.type === "loading" ? "Ucitavanje..." : "Osvezi"}
            </button>
            <Link className="button small outline" href="/#booking">
              Zakazi novi termin
            </Link>
            <button
              className="button small"
              type="button"
              onClick={handleLogout}
            >
              Odjava
            </button>
          </div>
        </div>

        <section className="appointments-overview">
          <div className="overview-card">
            <span>Ulogovani klijent</span>
            <strong>{client.name || "Klijent"}</strong>
            <p>{client.phone}</p>
            {client.email && <p>{client.email}</p>}
          </div>
          <div className="overview-card">
            <span>Ukupno termina</span>
            <strong>{appointments.length}</strong>
            <p>Prikaz svih rezervacija</p>
          </div>
          <div className="overview-card">
            <span>Naredni termini</span>
            <strong>{upcoming.length}</strong>
            <p>Aktivne rezervacije</p>
          </div>
        </section>

        {status.type === "error" && status.message && (
          <div className="form-status error">{status.message}</div>
        )}

        {!apiBaseUrl && (
          <div className="form-status error">
            API nije podesen. Dodaj NEXT_PUBLIC_API_BASE_URL u .env.
          </div>
        )}

        <section className="appointments-section">
          <div className="appointments-section__header">
            <h2>Sledeci termini</h2>
            <span>Zakazani termini u buducnosti</span>
          </div>
          {upcoming.length === 0 && (
            <div className="appointments-empty">
              Nema zakazanih termina. Zakazi novi termin kada si spreman.
            </div>
          )}
          <div className="appointments-list">
            {upcoming.map((appointment) => (
              <article key={appointment.id} className="appointment-item">
                <div>
                  <strong>{appointment.serviceName}</strong>
                  <span>
                    {formatLongDate(appointment.date)} | {normalizeTime(appointment.time)}
                  </span>
                </div>
                {appointment.status && (
                  <span className={`status-pill ${appointment.status}`}>
                    {statusLabels[appointment.status] || appointment.status}
                  </span>
                )}
                {appointment.status !== "cancelled" && (
                  <button
                    className="button small outline"
                    type="button"
                    disabled={cancelStatus.type === "loading"}
                    onClick={() => handleCancelRequest(appointment)}
                  >
                    Otkazi
                  </button>
                )}
              </article>
            ))}
          </div>
        </section>

        <section className="appointments-section">
          <div className="appointments-section__header">
            <h2>Istorija termina</h2>
            <span>Prethodni termini i otkazivanja</span>
          </div>
          {past.length === 0 && (
            <div className="appointments-empty">Jos nema zavrsenih termina.</div>
          )}
          <div className="appointments-list">
            {past.map((appointment) => (
              <article key={appointment.id} className="appointment-item">
                <div>
                  <strong>{appointment.serviceName}</strong>
                  <span>
                    {formatLongDate(appointment.date)} | {normalizeTime(appointment.time)}
                  </span>
                </div>
                {appointment.status && (
                  <span className={`status-pill ${appointment.status}`}>
                    {statusLabels[appointment.status] || appointment.status}
                  </span>
                )}
              </article>
            ))}
          </div>
        </section>
      {cancelTarget && (
        <div className="confirm-modal" role="dialog" aria-modal="true">
          <div className="confirm-modal__backdrop" onClick={handleCancelClose} />
          <div className="confirm-modal__card">
            <div className="confirm-modal__header">
              <strong>Otkazivanje termina</strong>
              <button
                className="confirm-modal__close"
                type="button"
                onClick={handleCancelClose}
                aria-label="Zatvori"
              >
                ×
              </button>
            </div>
            <p>
              Da li ste sigurni da zelite da otkazete termin za {cancelTarget.serviceName}?
            </p>
            <div className="confirm-modal__meta">
              <span>{formatLongDate(cancelTarget.date)}</span>
              <span>{normalizeTime(cancelTarget.time)}</span>
            </div>
            {cancelStatus.type !== "idle" && cancelStatus.message && (
              <div className={`form-status ${cancelStatus.type}`}>{cancelStatus.message}</div>
            )}
            <div className="confirm-modal__actions">
              <button
                className="button outline"
                type="button"
                onClick={handleCancelClose}
                disabled={cancelStatus.type === "loading"}
              >
                Odustani
              </button>
              <button
                className="button"
                type="button"
                onClick={handleCancelConfirm}
                disabled={cancelStatus.type === "loading"}
              >
                {cancelStatus.type === "loading" ? "Otkazivanje..." : "Potvrdi"}
              </button>
            </div>
          </div>
        </div>
      )}
      </main>
    </div>
  );
}


















