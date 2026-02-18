"use client";

import { useEffect, useState } from "react";

import AdminShell from "@/components/srdjan/admin/AdminShell";

type Dashboard = {
  kpi: {
    totalAppointments: number;
    upcomingAppointments: number;
    cancelledAppointments: number;
    monthlyRevenue: number;
    totalClients: number;
  };
};

export default function AdminDashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const response = await fetch("/api/admin/dashboard");
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error || "Nemate pristup dashboard-u.");
        setLoading(false);
        return;
      }
      setData(payload);
      setError("");
      setLoading(false);
    };
    load().catch(() => {
      setError("Ne mogu da ucitam dashboard.");
      setLoading(false);
    });
  }, []);

  return (
    <AdminShell title="Dashboard">
      {loading && <p>Ucitavanje...</p>}
      {!loading && error && <p className="form-status error">{error}</p>}
      {!loading && data && (
        <div className="admin-grid">
          <div className="admin-card">
            <strong>Ukupno termina</strong>
            <div>{data.kpi.totalAppointments}</div>
          </div>
          <div className="admin-card">
            <strong>Predstojeci termini</strong>
            <div>{data.kpi.upcomingAppointments}</div>
          </div>
          <div className="admin-card">
            <strong>Otkazani termini</strong>
            <div>{data.kpi.cancelledAppointments}</div>
          </div>
          <div className="admin-card">
            <strong>Prihod (mesec)</strong>
            <div>{data.kpi.monthlyRevenue} RSD</div>
          </div>
          <div className="admin-card">
            <strong>Ukupno klijenata</strong>
            <div>{data.kpi.totalClients}</div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}

