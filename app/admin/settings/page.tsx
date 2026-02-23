"use client";

import { useEffect, useState } from "react";

import AdminShell from "@/components/srdjan/admin/AdminShell";

type Location = {
  id: string;
  name: string;
  is_active: boolean;
};

export default function AdminSettingsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationId, setLocationId] = useState("");
  const [form, setForm] = useState({
    workStart: "11:00",
    workEnd: "19:00",
    morningStart: "11:00",
    morningEnd: "15:00",
    afternoonStart: "15:00",
    afternoonEnd: "19:00",
  });
  const [status, setStatus] = useState("");

  const loadSettings = async (targetLocationId: string) => {
    if (!targetLocationId) {
      return;
    }
    const settingsRes = await fetch(
      `/api/admin/shift-settings?locationId=${encodeURIComponent(targetLocationId)}`,
      { cache: "no-store" }
    );
    const settings = await settingsRes.json();
    if (!settingsRes.ok) {
      throw new Error(settings.error || "Ne mogu da ucitam podesavanja smena.");
    }
    if (settings.settings) {
      setForm({
        workStart: settings.settings.work_start,
        workEnd: settings.settings.work_end,
        morningStart: settings.settings.morning_start,
        morningEnd: settings.settings.morning_end,
        afternoonStart: settings.settings.afternoon_start,
        afternoonEnd: settings.settings.afternoon_end,
      });
      return;
    }
    setForm({
      workStart: "11:00",
      workEnd: "19:00",
      morningStart: "11:00",
      morningEnd: "15:00",
      afternoonStart: "15:00",
      afternoonEnd: "19:00",
    });
  };

  useEffect(() => {
    const load = async () => {
      const bootstrapRes = await fetch("/api/public/bootstrap", { cache: "no-store" });
      const bootstrap = await bootstrapRes.json();
      if (!bootstrapRes.ok) {
        throw new Error(bootstrap.error || "Ne mogu da ucitam lokaciju.");
      }
      const list = Array.isArray(bootstrap.locations) ? bootstrap.locations : [];
      setLocations(list);
      const nextLocationId = bootstrap.defaultLocationId || list[0]?.id || "";
      setLocationId(nextLocationId);
      await loadSettings(nextLocationId);
    };
    load().catch((error) => setStatus(error instanceof Error ? error.message : "Greska."));
  }, []);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus("");
    const response = await fetch("/api/admin/shift-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        locationId,
        workStart: form.workStart,
        workEnd: form.workEnd,
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
        <h3>Podesavanja po lokaciji</h3>
        <div className="form-row">
          <label>Lokacija</label>
          <select
            className="select"
            value={locationId}
            onChange={(event) => {
              const nextLocation = event.target.value;
              setLocationId(nextLocation);
              loadSettings(nextLocation).catch((error) =>
                setStatus(error instanceof Error ? error.message : "Greska.")
              );
            }}
          >
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="admin-card">
        <h3>Radno vreme lokala + smene</h3>
        <form className="form-grid" onSubmit={save}>
          <div className="form-row">
            <label>Lokal radi od</label>
            <input
              className="input"
              type="time"
              value={form.workStart}
              onChange={(event) => setForm((prev) => ({ ...prev, workStart: event.target.value }))}
            />
          </div>
          <div className="form-row">
            <label>Lokal radi do</label>
            <input
              className="input"
              type="time"
              value={form.workEnd}
              onChange={(event) => setForm((prev) => ({ ...prev, workEnd: event.target.value }))}
            />
          </div>
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
