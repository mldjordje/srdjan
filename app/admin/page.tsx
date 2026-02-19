"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AdminLoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ username: "", password: "" });
  const [status, setStatus] = useState("");
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const check = async () => {
      const response = await fetch("/api/admin/me");
      if (response.ok) {
        const data = await response.json();
        if (data.role === "staff-admin") {
          router.replace("/admin/staff");
          return;
        }
        router.replace("/admin/dashboard");
        return;
      }
      setChecking(false);
    };
    check().catch(() => setChecking(false));
  }, [router]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus("");
    const response = await fetch("/api/admin/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await response.json();
    if (!response.ok) {
      setStatus(data.error || "Prijava nije uspela.");
      return;
    }
    if (data.admin?.role === "staff-admin") {
      router.push("/admin/staff");
      return;
    }
    router.push("/admin/dashboard");
  };

  if (checking) {
    return (
      <main className="container" style={{ paddingTop: 24 }}>
        <p>Ucitavanje...</p>
      </main>
    );
  }

  return (
    <div className="page">
      <header className="nav">
        <div className="container nav-inner">
          <Link className="brand" href="/">
            <div className="brand-mark">
              <span className="brand-mark__text">FS</span>
            </div>
            <div className="brand-title">
              <span>Frizerski salon Srdjan</span>
              <span>Admin panel</span>
            </div>
          </Link>
          <nav className="nav-links">
            <Link href="/">Pocetna</Link>
            <Link href="/#booking">Zakazivanje</Link>
          </nav>
        </div>
      </header>

      <main className="admin-layout container">
        <div className="login-card">
          <div>
            <h1>Admin prijava</h1>
            <p>Owner i staff imaju razlicite privilegije, ali oboje imaju pristup kalendarima.</p>
          </div>
          <form className="form-row" onSubmit={submit}>
            <div className="form-row">
              <label>Korisnicko ime</label>
              <input
                className="input"
                value={form.username}
                onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
                required
              />
            </div>
            <div className="form-row">
              <label>Lozinka</label>
              <input
                type="password"
                className="input"
                value={form.password}
                onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                required
              />
            </div>
            {status && <p className="form-status error">{status}</p>}
            <div className="admin-actions">
              <button className="button" type="submit">
                Prijava
              </button>
              <Link className="button outline" href="/">
                Nazad
              </Link>
            </div>
          </form>
          <div className="admin-card">
            <strong>Seed nalozi</strong>
            <div>
              Owner: <code>owner / owner123!</code>
            </div>
            <div>
              Staff: <code>jasmina, denis, marko, ana / staff123!</code>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
