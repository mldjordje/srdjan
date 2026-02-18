"use client";

import { useEffect, useState } from "react";

import AdminShell from "@/components/srdjan/admin/AdminShell";

type Client = {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  appointmentsCount: number;
  created_at: string;
};

export default function AdminClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [workers, setWorkers] = useState<{ id: string; name: string }[]>([]);
  const [workerId, setWorkerId] = useState("");
  const [visibleClientIds, setVisibleClientIds] = useState<Set<string> | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");

  const loadWorkers = async () => {
    const bootstrapRes = await fetch("/api/public/bootstrap");
    const bootstrap = await bootstrapRes.json();
    if (!bootstrapRes.ok) {
      throw new Error(bootstrap.error || "Ne mogu da ucitam radnike.");
    }
    const list = Array.isArray(bootstrap.workers) ? bootstrap.workers : [];
    setWorkers(list);
    setWorkerId(list[0]?.id || "");
  };

  const load = async () => {
    setLoading(true);
    setStatus("");
    const response = await fetch("/api/admin/clients");
    const data = await response.json();
    if (!response.ok) {
      setStatus(data.error || "Ne mogu da ucitam klijente.");
      setLoading(false);
      return;
    }
    setClients(data.clients || []);
    setLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadWorkers().catch((error) =>
      setStatus(error instanceof Error ? error.message : "Greska.")
    );
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load().catch((error) => {
      setStatus(error instanceof Error ? error.message : "Greska.");
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!workerId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVisibleClientIds(null);
      return;
    }
    const loadForWorker = async () => {
      const response = await fetch(
        `/api/admin/appointments?workerId=${encodeURIComponent(workerId)}`
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Ne mogu da ucitam filter po radniku.");
      }
      const ids = new Set<string>(
        (data.appointments || []).map((item: { client_id: string }) => item.client_id)
      );
      setVisibleClientIds(ids);
    };
    loadForWorker().catch((error) =>
      setStatus(error instanceof Error ? error.message : "Greska.")
    );
  }, [workerId]);

  return (
    <AdminShell title="Klijenti">
      <div className="admin-card">
        <div className="admin-toolbar">
          <h3>Lista klijenata</h3>
          <button className="button outline" onClick={load}>Osvezi</button>
        </div>
        <div className="admin-actions">
          {workers.map((worker) => (
            <button
              key={worker.id}
              className={`button outline small ${workerId === worker.id ? "is-active" : ""}`}
              type="button"
              onClick={() => setWorkerId(worker.id)}
            >
              {worker.name}
            </button>
          ))}
        </div>
        {loading && <p>Ucitavanje...</p>}
        {!loading && clients.length === 0 && <p>Nema klijenata.</p>}
        {clients
          .filter((client) => (visibleClientIds ? visibleClientIds.has(client.id) : true))
          .map((client) => (
          <div key={client.id} className="admin-card">
            <strong>{client.full_name}</strong>
            <div>Telefon: {client.phone}</div>
            <div>Email: {client.email}</div>
            <div>Broj termina: {client.appointmentsCount}</div>
          </div>
        ))}
      </div>
      {status && <p className="form-status error">{status}</p>}
    </AdminShell>
  );
}
