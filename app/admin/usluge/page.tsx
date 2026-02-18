"use client";

import { useEffect, useMemo, useState } from "react";

import AdminShell from "@/components/srdjan/admin/AdminShell";

type Worker = { id: string; name: string; location_id: string };
type WorkerService = {
  id: string;
  worker_id: string;
  duration_min: number;
  price: number;
  is_active: boolean;
  services?: { id: string; name: string } | null;
  workers?: { id: string; name: string } | null;
};

export default function AdminServicesPage() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [workerId, setWorkerId] = useState("");
  const [services, setServices] = useState<WorkerService[]>([]);
  const [status, setStatus] = useState("");
  const [form, setForm] = useState({
    workerId: "",
    name: "",
    durationMin: "30",
    price: "1000",
  });

  const loadWorkers = async () => {
    const bootstrapRes = await fetch("/api/public/bootstrap");
    const bootstrap = await bootstrapRes.json();
    if (!bootstrapRes.ok) {
      throw new Error(bootstrap.error || "Ne mogu da ucitam radnike.");
    }
    const workerList: Worker[] = bootstrap.workers || [];
    setWorkers(workerList);
    const first = workerList[0]?.id || "";
    setWorkerId(first);
    setForm((prev) => ({ ...prev, workerId: first }));
  };

  const loadServices = async (nextWorkerId = workerId) => {
    const query = nextWorkerId ? `?workerId=${encodeURIComponent(nextWorkerId)}` : "";
    const response = await fetch(`/api/admin/services${query}`);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Ne mogu da ucitam usluge.");
    }
    setServices(data.services || []);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadWorkers()
      .then(() => undefined)
      .catch((error) => setStatus(error instanceof Error ? error.message : "Greska."));
  }, []);

  useEffect(() => {
    if (!workerId) {
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadServices().catch((error) => setStatus(error instanceof Error ? error.message : "Greska."));
  }, [workerId]);

  const filtered = useMemo(
    () => services.filter((service) => !workerId || service.worker_id === workerId),
    [services, workerId]
  );

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus("");
    const response = await fetch("/api/admin/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workerId: form.workerId,
        name: form.name,
        durationMin: Number(form.durationMin),
        price: Number(form.price),
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setStatus(data.error || "Ne mogu da kreiram uslugu.");
      return;
    }
    setStatus("Usluga je sacuvana.");
    setForm((prev) => ({ ...prev, name: "" }));
    await loadServices();
  };

  const toggleActive = async (item: WorkerService) => {
    const response = await fetch("/api/admin/services", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workerServiceId: item.id,
        isActive: !item.is_active,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setStatus(data.error || "Ne mogu da promenim status.");
      return;
    }
    await loadServices();
  };

  return (
    <AdminShell title="Usluge">
      <div className="admin-card">
        <h3>Podmeni po clanu staff-a</h3>
        <div className="admin-actions">
          {workers.map((worker) => (
            <button
              key={worker.id}
              className={`button outline small ${workerId === worker.id ? "is-active" : ""}`}
              type="button"
              onClick={() => {
                setWorkerId(worker.id);
                setForm((prev) => ({ ...prev, workerId: worker.id }));
              }}
            >
              {worker.name}
            </button>
          ))}
        </div>
      </div>

      <div className="admin-card">
        <h3>Nova usluga za radnika</h3>
        <form className="form-grid" onSubmit={create}>
          <div className="form-row">
            <label>Radnik</label>
            <select
              className="select"
              value={form.workerId}
              onChange={(event) => setForm((prev) => ({ ...prev, workerId: event.target.value }))}
              required
            >
              {workers.map((worker) => (
                <option key={worker.id} value={worker.id}>
                  {worker.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <label>Naziv usluge</label>
            <input
              className="input"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              required
            />
          </div>
          <div className="form-row">
            <label>Trajanje (min)</label>
            <input
              className="input"
              type="number"
              min="5"
              step="5"
              value={form.durationMin}
              onChange={(event) => setForm((prev) => ({ ...prev, durationMin: event.target.value }))}
              required
            />
          </div>
          <div className="form-row">
            <label>Cena (RSD)</label>
            <input
              className="input"
              type="number"
              min="0"
              value={form.price}
              onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))}
              required
            />
          </div>
          <div className="form-row">
            <button className="button" type="submit">Sacuvaj uslugu</button>
          </div>
        </form>
      </div>

      <div className="admin-card">
        <h3>Usluge ({filtered.length})</h3>
        {filtered.map((item) => (
          <div key={item.id} className="admin-card">
            <strong>{item.services?.name || "-"}</strong>
            <div>Radnik: {item.workers?.name || "-"}</div>
            <div>Trajanje: {item.duration_min} min</div>
            <div>Cena: {item.price} RSD</div>
            <div>Status: {item.is_active ? "Aktivna" : "Neaktivna"}</div>
            <button className="button outline" type="button" onClick={() => toggleActive(item)}>
              {item.is_active ? "Deaktiviraj" : "Aktiviraj"}
            </button>
          </div>
        ))}
      </div>

      {status && <p className="form-status success">{status}</p>}
    </AdminShell>
  );
}
