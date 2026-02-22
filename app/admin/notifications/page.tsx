"use client";

import { useEffect, useState } from "react";

import AdminShell from "@/components/srdjan/admin/AdminShell";
import { formatIsoDateTimeToEuropean } from "@/lib/date";

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  created_at: string;
  is_read: boolean;
  clients?: { full_name?: string; phone?: string } | null;
};

export default function AdminNotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [workers, setWorkers] = useState<{ id: string; name: string }[]>([]);
  const [workerId, setWorkerId] = useState("");
  const [status, setStatus] = useState("");

  const load = async (nextWorkerId = workerId) => {
    setStatus("");
    const query = nextWorkerId ? `?workerId=${encodeURIComponent(nextWorkerId)}` : "";
    const response = await fetch(`/api/admin/notifications${query}`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) {
      setStatus(data.error || "Ne mogu da ucitam notifikacije.");
      return;
    }
    setItems(data.notifications || []);
  };

  useEffect(() => {
    const loadWorkers = async () => {
      const [bootstrapRes, meRes] = await Promise.all([
        fetch("/api/public/bootstrap", { cache: "no-store" }),
        fetch("/api/admin/me", { cache: "no-store" }),
      ]);
      const bootstrap = await bootstrapRes.json();
      if (!bootstrapRes.ok) {
        throw new Error(bootstrap.error || "Ne mogu da ucitam radnike.");
      }
      const list = Array.isArray(bootstrap.workers) ? bootstrap.workers : [];
      const meData = meRes.ok ? await meRes.json() : null;
      const ownWorkerId = (meData?.workerId || "").trim();
      setWorkers(list);
      setWorkerId(list.find((worker: { id: string }) => worker.id === ownWorkerId)?.id || list[0]?.id || "");
    };
    loadWorkers().catch((error) => setStatus(error instanceof Error ? error.message : "Greska."));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(workerId).catch((error) => setStatus(error instanceof Error ? error.message : "Greska."));
  }, [workerId]);

  return (
    <AdminShell title="Notifikacije">
      <div className="admin-card">
        <div className="admin-toolbar">
          <h3>Klijentske notifikacije</h3>
          <button className="button outline" onClick={() => load()}>Osvezi</button>
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
        {items.length === 0 && <p>Nema notifikacija.</p>}
        {items.map((item) => (
          <div key={item.id} className="admin-card">
            <strong>{item.title}</strong>
            <div>Tip: {item.type}</div>
            <div>{item.message}</div>
            <div>
              Klijent: {item.clients?.full_name || "-"} ({item.clients?.phone || "-"})
            </div>
            <div>Kreirano: {formatIsoDateTimeToEuropean(item.created_at)}</div>
          </div>
        ))}
      </div>
      {status && <p className="form-status error">{status}</p>}
    </AdminShell>
  );
}
