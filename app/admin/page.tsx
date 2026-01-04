"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

const adminUser = process.env.NEXT_PUBLIC_ADMIN_USER || "admin";
const adminPass = process.env.NEXT_PUBLIC_ADMIN_PASS || "admin123";

type StatusState = {
  type: "idle" | "success" | "error";
  message?: string;
};

export default function AdminLoginPage() {
  const router = useRouter();
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
      setStatus({ type: "success", message: "Ulogovani ste u CMS." });
      router.push("/admin/calendar");
      return;
    }

    setStatus({
      type: "error",
      message: "Pogresno korisnicko ime ili lozinka.",
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
              <span>CMS Panel</span>
            </div>
          </Link>
          <nav className="nav-links">
            <Link href="/">Pocetna</Link>
            <Link href="/#booking">Zakazi termin</Link>
          </nav>
        </div>
      </header>

      <main className="admin-layout container">
        <div className="login-card">
          <div>
            <h1>CMS prijava</h1>
            <p>Pristup za pregled termina, kalendara i klijenata.</p>
          </div>
          <form className="form-row" onSubmit={handleLogin}>
            <div className="form-row">
              <label htmlFor="user">Korisnicko ime</label>
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
      </main>
    </div>
  );
}
