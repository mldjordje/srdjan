"use client";

import { useEffect, useState } from "react";

import AdminShell from "@/components/srdjan/admin/AdminShell";

export default function AdminSettingsPage() {
  const [locationId, setLocationId] = useState("");
  const [form, setForm] = useState({
    morningStart: "11:00",
    morningEnd: "15:00",
    afternoonStart: "15:00",
    afternoonEnd: "19:00",
  });
  const [status, setStatus] = useState("");

  useEffect(() => {
    const load = async () => {
      const bootstrapRes = await fetch("/api/public/bootstrap");
      const bootstrap = await bootstrapRes.json();
      if (!bootstrapRes.ok) {
        throw new Error(bootstrap.error || "Ne mogu da ucitam lokaciju.");
      }
      const nextLocationId = bootstrap.defaultLocationId || bootstrap.locations?.[0]?.id || "";
      setLocationId(nextLocationId);

      const settingsRes = await fetch(
        `/api/admin/shift-settings?locationId=${encodeURIComponent(nextLocationId)}`
      );
      const settings = await settingsRes.json();
      if (!settingsRes.ok) {
        throw new Error(settings.error || "Ne mogu da ucitam podesavanja smena.");
      }
      if (settings.settings) {
        setForm({
          morningStart: settings.settings.morning_start,
          morningEnd: settings.settings.morning_end,
          afternoonStart: settings.settings.afternoon_start,
          afternoonEnd: settings.settings.afternoon_end,
        });
      }
    };
    load().catch((error) => setStatus(error instanceof Error ? error.message : "Greska."));
  }, []);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const response = await fetch("/api/admin/shift-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        locationId,
        morningStart: form.morningStart,
        morningEnd: form.morningEnd,
        afternoonStart: form.afternoonStart,
        afternoonEnd: form.afternoonEnd,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setStatus(data.error || "Ne mogu da sacuvam podesavanja.");
      return;
    }
    setStatus("Podesavanja smena su sacuvana.");
  };

  return (
    <AdminShell title="Podesavanja">
      <div className="admin-card">
        <h3>Sati smena (prepodne/popodne)</h3>
        <form className="form-grid" onSubmit={save}>
          <div className="form-row">
            <label>Prepodne od</label>
            <input
              className="input"
              type="time"
              value={form.morningStart}
              onChange={(event) => setForm((prev) => ({ ...prev, morningStart: event.target.value }))}
            />
          </div>
          <div className="form-row">
            <label>Prepodne do</label>
            <input
              className="input"
              type="time"
              value={form.morningEnd}
              onChange={(event) => setForm((prev) => ({ ...prev, morningEnd: event.target.value }))}
            />
          </div>
          <div className="form-row">
            <label>Popodne od</label>
            <input
              className="input"
              type="time"
              value={form.afternoonStart}
              onChange={(event) => setForm((prev) => ({ ...prev, afternoonStart: event.target.value }))}
            />
          </div>
          <div className="form-row">
            <label>Popodne do</label>
            <input
              className="input"
              type="time"
              value={form.afternoonEnd}
              onChange={(event) => setForm((prev) => ({ ...prev, afternoonEnd: event.target.value }))}
            />
          </div>
          <div className="form-row">
            <button className="button" type="submit">Sacuvaj</button>
          </div>
        </form>
      </div>
      {status && <p className="form-status success">{status}</p>}
    </AdminShell>
  );
}

