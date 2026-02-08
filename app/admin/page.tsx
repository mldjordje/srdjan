"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useLanguage, type Language } from "@/lib/useLanguage";

const adminUser = process.env.NEXT_PUBLIC_ADMIN_USER || "admin";
const adminPass = process.env.NEXT_PUBLIC_ADMIN_PASS || "admin123";

type StatusState = {
  type: "idle" | "success" | "error";
  message?: string;
};

export default function AdminLoginPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const copy: Record<
    Language,
    {
      cmsPanel: string;
      home: string;
      book: string;
      title: string;
      subtitle: string;
      username: string;
      password: string;
      login: string;
      loginSuccess: string;
      loginError: string;
    }
  > = {
    sr: {
      cmsPanel: "CMS Panel",
      home: "Pocetna",
      book: "Zakazi termin",
      title: "CMS prijava",
      subtitle: "Pristup za pregled termina, kalendara i klijenata.",
      username: "Korisnicko ime",
      password: "Lozinka",
      login: "Prijavi se",
      loginSuccess: "Ulogovani ste u CMS.",
      loginError: "Pogresno korisnicko ime ili lozinka.",
    },
    en: {
      cmsPanel: "CMS Panel",
      home: "Home",
      book: "Book appointment",
      title: "CMS login",
      subtitle: "Access appointments, calendar, and clients.",
      username: "Username",
      password: "Password",
      login: "Sign in",
      loginSuccess: "You are logged in to CMS.",
      loginError: "Invalid username or password.",
    },
    it: {
      cmsPanel: "Pannello CMS",
      home: "Home",
      book: "Prenota",
      title: "Accesso CMS",
      subtitle: "Accesso a appuntamenti, calendario e clienti.",
      username: "Nome utente",
      password: "Password",
      login: "Accedi",
      loginSuccess: "Accesso al CMS effettuato.",
      loginError: "Nome utente o password non validi.",
    },
  };
  const t = copy[language];
  const [credentials, setCredentials] = useState({ user: "", pass: "" });
  const [status, setStatus] = useState<StatusState>({ type: "idle" });

  useEffect(() => {
    if (localStorage.getItem("db_admin_auth") === "true") {
      router.replace("/admin/calendar");
    }
  }, [router]);

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
      setStatus({ type: "success", message: t.loginSuccess });
      router.push("/admin/calendar");
      return;
    }

    setStatus({
      type: "error",
      message: t.loginError,
    });
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
              <span>{t.cmsPanel}</span>
            </div>
          </Link>
          <nav className="nav-links">
            <LanguageSwitcher compact />
            <Link href="/">{t.home}</Link>
            <Link href="/#booking">{t.book}</Link>
          </nav>
        </div>
      </header>

      <main className="admin-layout container">
        <div className="login-card">
          <div>
            <h1>{t.title}</h1>
            <p>{t.subtitle}</p>
          </div>
          <form className="form-row" onSubmit={handleLogin}>
            <div className="form-row">
              <label htmlFor="user">{t.username}</label>
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
              <label htmlFor="pass">{t.password}</label>
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
              {t.login}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
