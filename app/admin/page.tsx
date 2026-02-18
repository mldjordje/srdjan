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
          router.replace("/admin/calendar");
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
      router.push("/admin/calendar");
      return;
    }
    router.push("/admin/dashboard");
  };

  if (checking) {
    return <main className="container"><p>Ucitavanje...</p></main>;
  }

  return (
    <main className="container" style={{ paddingTop: 24 }}>
      <h1>Admin prijava</h1>
      <p>Owner i Staff-admin imaju razlicite privilegije.</p>
      <form className="admin-card" onSubmit={submit}>
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
          <button className="button" type="submit">Prijava</button>
          <Link className="button outline" href="/">Nazad</Link>
        </div>
      </form>
      <div className="admin-card">
        <strong>Seed nalozi</strong>
        <div>Owner: <code>owner / owner123!</code></div>
        <div>Staff: <code>staff / staff123!</code></div>
      </div>
    </main>
  );
}
