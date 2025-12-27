"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";
const adminUser = process.env.NEXT_PUBLIC_ADMIN_USER || "admin";
const adminPass = process.env.NEXT_PUBLIC_ADMIN_PASS || "admin123";
const adminKey = process.env.NEXT_PUBLIC_ADMIN_KEY || "";

type Appointment = {
  id: string;
  clientName: string;
  phone: string;
  email?: string;
  serviceName: string;
  date: string;
  time: string;
  notes?: string;
  createdAt?: string;
};

type StatusState = {
  type: "idle" | "sending" | "success" | "error";
  message?: string;
};

export default function AdminPage() {
  const [credentials, setCredentials] = useState({ user: "", pass: "" });
  const [status, setStatus] = useState<StatusState>({ type: "idle" });
  const [loggedIn, setLoggedIn] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("db_admin_auth");
    if (stored === "true") {
      setLoggedIn(true);
      fetchAppointments();
    }
  }, []);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setCredentials((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (credentials.user === adminUser && credentials.pass === adminPass) {
      localStorage.setItem("db_admin_auth", "true");
      setLoggedIn(true);
      setStatus({ type: "success", message: "Ulogovani ste u CMS." });
      fetchAppointments();
      return;
    }

    setStatus({
      type: "error",
      message: "Pogrešno korisničko ime ili lozinka.",
    });
  };

  const handleLogout = () => {
    localStorage.removeItem("db_admin_auth");
    setLoggedIn(false);
    setAppointments([]);
    setStatus({ type: "idle" });
  };

  const fetchAppointments = async () => {
    if (!apiBaseUrl) {
      setStatus({
        type: "error",
        message: "API nije podešen. Dodaj NEXT_PUBLIC_API_BASE_URL u .env.",
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

    setLoading(true);

    try {
      const response = await fetch(`${apiBaseUrl}/appointments.php`, {
        headers: {
          "X-Admin-Key": adminKey,
        },
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Ne mogu da preuzmem termine.");
      }

      const items = Array.isArray(data.appointments) ? data.appointments : [];
      items.sort((a: Appointment, b: Appointment) =>
        `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)
      );
      setAppointments(items);
      setStatus({ type: "success", message: "Termini su osveženi." });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Došlo je do greške.";
      setStatus({ type: "error", message });
    } finally {
      setLoading(false);
    }
  };

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
              <span>CMS Panel</span>
            </div>
          </Link>
          <nav className="nav-links">
            <Link href="/">Početna</Link>
            <Link href="/#booking">Zakaži termin</Link>
          </nav>
        </div>
      </header>

      <main className="admin-layout container">
        {!loggedIn && (
          <div className="login-card">
            <div>
              <h1>CMS prijava</h1>
              <p>Pregled i kontrola zakazanih termina u realnom vremenu.</p>
            </div>
            <form className="form-row" onSubmit={handleLogin}>
              <div className="form-row">
                <label htmlFor="user">Korisničko ime</label>
                <input
                  id="user"
                  name="user"
                  className="input"
                  value={credentials.user}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-row">
                <label htmlFor="pass">Lozinka</label>
                <input
                  id="pass"
                  name="pass"
                  className="input"
                  type="password"
                  value={credentials.pass}
                  onChange={handleChange}
                  required
                />
              </div>
              {status.type !== "idle" && status.message && (
                <div className={`form-status ${status.type}`}>{status.message}</div>
              )}
              <button className="button" type="submit">
                Prijavi se
              </button>
            </form>
          </div>
        )}

        {loggedIn && (
          <div className="admin-grid">
            <div className="section-header">
              <div>
                <h2>Zakazani termini</h2>
                <p>Ukupno termina: {appointments.length}</p>
              </div>
              <div className="hero-actions">
                <button className="button" type="button" onClick={fetchAppointments}>
                  {loading ? "Osvežavanje..." : "Osveži listu"}
                </button>
                <button className="button outline" type="button" onClick={handleLogout}>
                  Odjava
                </button>
              </div>
            </div>
            {status.type !== "idle" && status.message && (
              <div className={`form-status ${status.type}`}>{status.message}</div>
            )}
            {appointments.length === 0 && !loading && (
              <p>Nema zakazanih termina.</p>
            )}
            {appointments.map((appointment) => (
              <div key={appointment.id} className="appointment-card">
                <strong>{appointment.serviceName}</strong>
                <span>
                  {appointment.date} | {appointment.time}
                </span>
                <div>{appointment.clientName}</div>
                <span>{appointment.phone}</span>
                {appointment.email && <span>{appointment.email}</span>}
                {appointment.notes && <span>Napomena: {appointment.notes}</span>}
                {appointment.createdAt && <span>Kreirano: {appointment.createdAt}</span>}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
