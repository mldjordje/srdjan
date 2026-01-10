"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";

type ClientProfile = {
  name: string;
  phone: string;
  email: string;
  token: string;
};

type StatusState = {
  type: "idle" | "sending" | "success" | "error";
  message?: string;
};

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
  });
  const [status, setStatus] = useState<StatusState>({ type: "idle" });
  const [client, setClient] = useState<ClientProfile | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("db_client_token");
    if (!token) {
      return;
    }

    const name = localStorage.getItem("db_client_name") || "";
    const phone = localStorage.getItem("db_client_phone") || "";
    const email = localStorage.getItem("db_client_email") || "";

    setClient({ name, phone, email, token });
  }, []);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
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

    setStatus({ type: "sending" });

    try {
      const response = await fetch(`${apiBaseUrl}/clients.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode: "register",
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Ne mogu da registrujem korisnika.");
      }

      const profile = {
        name: data.client?.name || formData.name.trim(),
        phone: data.client?.phone || formData.phone.trim(),
        email: data.client?.email || formData.email.trim(),
        token: data.client?.token,
      } as ClientProfile;

      localStorage.setItem("db_client_token", profile.token);
      localStorage.setItem("db_client_name", profile.name);
      localStorage.setItem("db_client_phone", profile.phone);
      localStorage.setItem("db_client_email", profile.email);

      setClient(profile);
      setStatus({ type: "success", message: "Registracija je uspesna." });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Doslo je do greske.";
      setStatus({ type: "error", message });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("db_client_token");
    localStorage.removeItem("db_client_name");
    localStorage.removeItem("db_client_phone");
    localStorage.removeItem("db_client_email");
    setClient(null);
    setStatus({ type: "idle" });
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
              <span>Barber Studio</span>
            </div>
          </Link>
          <nav className="nav-links">
            <Link href="/">Pocetna</Link>
            <Link href="/#booking">Zakazi termin</Link>
            {!client && <Link href="/login">Prijava</Link>}
            {client && <Link href="/moji-termini">Moji termini</Link>}
            {client && (
              <button className="button small ghost" type="button" onClick={handleLogout}>
                Odjava
              </button>
            )}
          </nav>
        </div>
      </header>

      <main className="login-layout container">
        <div className="login-card">
          <div>
            <h1>Registracija klijenata</h1>
            <p>
              Napravi nalog za brze rezervacije i pregled svih termina na jednom
              mestu. Bez naloga nije moguce zakazivanje.
            </p>
          </div>

          {!client && (
            <form className="form-row" onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-row form-row--full">
                  <label htmlFor="name">Ime i prezime</label>
                  <input
                    id="name"
                    name="name"
                    className="input"
                    value={formData.name}
                    onChange={handleChange}
                    autoComplete="name"
                    required
                  />
                </div>
                <div className="form-row">
                  <label htmlFor="phone">Telefon</label>
                  <input
                    id="phone"
                    name="phone"
                    className="input"
                    value={formData.phone}
                    onChange={handleChange}
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    required
                  />
                </div>
                <div className="form-row">
                  <label htmlFor="email">Email (opciono)</label>
                  <input
                    id="email"
                    name="email"
                    className="input"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    autoComplete="email"
                  />
                </div>
              </div>
              {status.type !== "idle" && status.message && (
                <div className={`form-status ${status.type}`}>{status.message}</div>
              )}
              <button
                className="button"
                type="submit"
                disabled={status.type === "sending"}
              >
                {status.type === "sending" ? "Registracija..." : "Registruj se"}
              </button>
              <p className="auth-link">
                Vec imas nalog? <Link href="/login">Prijavi se</Link>
              </p>
            </form>
          )}

          {client && (
            <div>
              <div className="form-status success">
                Ulogovani ste kao {client.name} ({client.phone}).
              </div>
              <div className="hero-actions">
                <Link className="button" href="/#booking">
                  Zakazi termin
                </Link>
                <button
                  className="button outline"
                  onClick={handleLogout}
                  type="button"
                >
                  Odjava
                </button>
              </div>
            </div>
          )}

          {!apiBaseUrl && (
            <div className="form-status error">
              API nije podesen. Dodaj NEXT_PUBLIC_API_BASE_URL u .env.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

