"use client";

import { useEffect, useState } from "react";

import OwnerRevenueOverview, {
  type MonthRevenueSummary,
  type RevenueMonthOption,
} from "@/components/admin/OwnerRevenueOverview";
import AdminShell from "@/components/srdjan/admin/AdminShell";

type Dashboard = {
  kpi: {
    monthlyRevenue: number;
    totalAppointments: number;
    cancelledAppointments: number;
    upcomingAppointments: number;
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

export default function AdminRevenuePage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [status, setStatus] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");

  useEffect(() => {
    const load = async () => {
      const query = selectedMonth ? `?month=${encodeURIComponent(selectedMonth)}` : "";
      const response = await fetch(`/api/admin/dashboard${query}`, {
        cache: "no-store",
        credentials: "include",
      });
      const payload = await response.json();
      if (!response.ok) {
        setStatus(payload.error || "Nemate pristup zaradi.");
        return;
      }
      setData(payload);
      setSelectedMonth(payload.revenue?.selectedMonthValue || "");
    };
    load().catch((error) => setStatus(error instanceof Error ? error.message : "Greska."));
  }, [selectedMonth]);

  return (
    <AdminShell title="Zarada">
      {status && <p className="form-status error">{status}</p>}
      {data && (
        <>
          <div className="dashboard-overview">
            <div className="admin-card">
              <strong>Mesecni prihod</strong>
              <div>{data.kpi.monthlyRevenue.toLocaleString("sr-RS")} RSD</div>
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
