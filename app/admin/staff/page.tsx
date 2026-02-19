"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import AdminShell from "@/components/srdjan/admin/AdminShell";

type AdminMe = {
  id: string;
  username: string;
  role: "owner" | "staff-admin";
};

type Worker = {
  id: string;
  name: string;
  location_id: string;
};

export default function AdminStaffPage() {
  const [admin, setAdmin] = useState<AdminMe | null>(null);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setStatus("");

      const [meResponse, workersResponse] = await Promise.all([
        fetch("/api/admin/me"),
        fetch("/api/admin/workers"),
      ]);

      const mePayload = await meResponse.json();
      if (!meResponse.ok) {
        throw new Error(mePayload.error || "Niste prijavljeni.");
      }

      const workersPayload = await workersResponse.json();
      if (!workersResponse.ok) {
        throw new Error(workersPayload.error || "Ne mogu da ucitam radnike.");
      }

      setAdmin(mePayload);
      setWorkers(Array.isArray(workersPayload.workers) ? workersPayload.workers : []);
      setLoading(false);
    };

    load().catch((error) => {
      setLoading(false);
      setStatus(error instanceof Error ? error.message : "Greska pri ucitavanju.");
    });
  }, []);

  const subtitle = useMemo(() => {
    if (loading) {
      return "Ucitavanje staff pregleda...";
    }
    if (admin?.role === "owner") {
      return "Brza navigacija kroz sve radnike i admin sekcije.";
    }
    return "Brza navigacija za staff: izaberi radnika i otvori njegov kalendar.";
  }, [admin, loading]);

  return (
    <AdminShell title="Staff navigacija" subtitle={subtitle}>
      {status && <p className="form-status error">{status}</p>}

      <div className="admin-card">
        <h3>Brze admin sekcije</h3>
        <div className="admin-actions">
          <Link className="button outline small" href="/admin/calendar">
            Kalendar
          </Link>
          <Link className="button outline small" href="/admin/termini">
            Termini
          </Link>
          <Link className="button outline small" href="/admin/clients">
            Klijenti
          </Link>
          <Link className="button outline small" href="/admin/usluge">
            Usluge
          </Link>
          <Link className="button outline small" href="/admin/notifications">
            Notifikacije
          </Link>
          <Link className="button outline small" href="/admin/tutorial">
            Tutorial
          </Link>
          {admin?.role === "owner" && (
            <>
              <Link className="button outline small" href="/admin/radnici">
                Radnici
              </Link>
              <Link className="button outline small" href="/admin/dashboard">
                Dashboard
              </Link>
              <Link className="button outline small" href="/admin/settings">
                Podesavanja
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="admin-card">
        <h3>Radnici</h3>
        <p>Izaberi radnika da otvoris njegov kalendar. U kalendaru mozes odmah da switch-ujes na drugog.</p>
        {loading && <p>Ucitavanje radnika...</p>}
        {!loading && workers.length === 0 && <p>Nema aktivnih radnika.</p>}
        {!loading && workers.length > 0 && (
          <div className="dashboard-list">
            {workers.map((worker) => (
              <Link
                key={worker.id}
                className="dashboard-list-item"
                href={`/admin/calendar?workerId=${encodeURIComponent(worker.id)}`}
              >
                <div>
                  <strong>{worker.name}</strong>
                  <span>Otvori kalendar i termine za {worker.name}</span>
                </div>
                <span>Otvori</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
