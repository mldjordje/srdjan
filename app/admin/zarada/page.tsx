"use client";

import { useEffect, useState } from "react";

import AdminShell from "@/components/srdjan/admin/AdminShell";

type Dashboard = {
  kpi: {
    monthlyRevenue: number;
    totalAppointments: number;
    cancelledAppointments: number;
    upcomingAppointments: number;
  };
};

export default function AdminRevenuePage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const load = async () => {
      const response = await fetch("/api/admin/dashboard");
      const payload = await response.json();
      if (!response.ok) {
        setStatus(payload.error || "Nemate pristup zaradi.");
        return;
      }
      setData(payload);
    };
    load().catch((error) => setStatus(error instanceof Error ? error.message : "Greska."));
  }, []);

  return (
    <AdminShell title="Zarada">
      {status && <p className="form-status error">{status}</p>}
      {data && (
        <div className="admin-grid">
          <div className="admin-card">
            <strong>Mesecni prihod</strong>
            <div>{data.kpi.monthlyRevenue} RSD</div>
          </div>
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
        </div>
      )}
    </AdminShell>
  );
}

