"use client";

import { useEffect, useState } from "react";

import OwnerRevenueOverview, {
  type MonthRevenueSummary,
  type RevenueMonthOption,
} from "@/components/admin/OwnerRevenueOverview";
import AdminShell from "@/components/srdjan/admin/AdminShell";

type Dashboard = {
  kpi: {
    totalAppointments: number;
    upcomingAppointments: number;
    cancelledAppointments: number;
    monthlyRevenue: number;
    totalClients: number;
  };
  revenue: {
    currentMonth: MonthRevenueSummary;
    selectedMonth: MonthRevenueSummary;
    selectedMonthValue: string;
    monthOptions: RevenueMonthOption[];
    savedMonths: MonthRevenueSummary[];
    historyStorageEnabled: boolean;
  };
};

export default function AdminDashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const query = selectedMonth ? `?month=${encodeURIComponent(selectedMonth)}` : "";
      const response = await fetch(`/api/admin/dashboard${query}`, {
        cache: "no-store",
        credentials: "include",
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error || "Nemate pristup dashboard-u.");
        setLoading(false);
        return;
      }
      setData(payload);
      setSelectedMonth(payload.revenue?.selectedMonthValue || "");
      setError("");
      setLoading(false);
    };
    load().catch(() => {
      setError("Ne mogu da ucitam dashboard.");
      setLoading(false);
    });
  }, [selectedMonth]);

  return (
    <AdminShell title="Dashboard">
      {loading && <p>Ucitavanje...</p>}
      {!loading && error && <p className="form-status error">{error}</p>}
      {!loading && data && (
        <>
          <div className="dashboard-overview">
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
              <div>{data.kpi.monthlyRevenue.toLocaleString("sr-RS")} RSD</div>
            </div>
            <div className="admin-card">
              <strong>Ukupno klijenata</strong>
              <div>{data.kpi.totalClients}</div>
            </div>
          </div>

          <OwnerRevenueOverview
            selectedMonth={data.revenue.selectedMonth}
            selectedMonthValue={data.revenue.selectedMonthValue}
            monthOptions={data.revenue.monthOptions}
            onMonthChange={setSelectedMonth}
            currentMonth={data.revenue.currentMonth}
            savedMonths={data.revenue.savedMonths}
            historyStorageEnabled={data.revenue.historyStorageEnabled}
          />
        </>
      )}
    </AdminShell>
  );
}
