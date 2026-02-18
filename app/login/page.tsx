"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ fullName: "", phone: "", email: "" });
  const [status, setStatus] = useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus("");
    const response = await fetch("/api/public/session/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await response.json();
    if (!response.ok) {
      setStatus(data.error || "Prijava nije uspela.");
      return;
    }
    router.push("/");
  };

  return (
    <main className="container" style={{ paddingTop: 24 }}>
      <h1>Prijava klijenta</h1>
      <form className="admin-card" onSubmit={submit}>
        <div className="form-row">
          <label>Ime i prezime</label>
          <input className="input" value={form.fullName} onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))} required />
        </div>
        <div className="form-row">
          <label>Telefon</label>
          <input className="input" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} required />
        </div>
        <div className="form-row">
          <label>Email</label>
          <input className="input" type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} required />
        </div>
        {status && <p className="form-status error">{status}</p>}
        <div className="admin-actions">
          <button className="button" type="submit">Prijava</button>
          <Link className="button outline" href="/">Nazad</Link>
        </div>
      </form>
    </main>
  );
}

