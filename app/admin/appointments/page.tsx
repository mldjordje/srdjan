"use client";

import { useEffect, useState } from "react";

import AdminShell from "@/components/admin/AdminShell";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";
const adminKey = process.env.NEXT_PUBLIC_ADMIN_KEY || "";

type Appointment = {
  id: string;
  clientName: string;
  phone: string;
  email?: string;
  serviceName: string;
  date: string;
  time: string;
  notes?: string;
  status?: string;
  createdAt?: string;
};

type StatusState = {
  type: "idle" | "loading" | "success" | "error";
  message?: string;
};

const statusOptions = [
  { value: "pending", label: "Na cekanju" },
  { value: "confirmed", label: "Potvrdjen" },
  { value: "completed", label: "Zavrsen" },
  { value: "cancelled", label: "Otkazan" },
];

const statusLabels: Record<string, string> = {
  pending: "Na cekanju",
  confirmed: "Potvrdjen",
  completed: "Zavrsen",
  cancelled: "Otkazan",
};

export default function AdminAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [status, setStatus] = useState<StatusState>({ type: "idle" });

  const fetchAppointments = async () => {
    if (!apiBaseUrl) {
      setStatus({
        type: "error",
        message: "API nije podesen. Dodaj NEXT_PUBLIC_API_BASE_URL u .env.",
      });
      return;
    }

    if (!adminKey) {
      setStatus({
        type: "error",
        message: "Dodaj NEXT_PUBLIC_ADMIN_KEY u .env da bi CMS radio.",
      });
      return;
    }

    setStatus({ type: "loading" });

    try {
      const response = await fetch(`${apiBaseUrl}/appointments.php`, {
        headers: {
          "X-Admin-Key": adminKey,
        },
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Ne mogu da preuzmem termine.");
      }

      const items = Array.isArray(data.appointments) ? data.appointments : [];
      items.sort((a: Appointment, b: Appointment) =>
        `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)
      );
      setAppointments(items);
      setStatus({ type: "success", message: "Termini su osvezeni." });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Doslo je do greske.";
      setStatus({ type: "error", message });
    }
  };

  const updateStatus = async (id: string, nextStatus: string) => {
    if (!apiBaseUrl || !adminKey) {
      return;
    }

    setStatus({ type: "loading" });

    try {
      const response = await fetch(`${apiBaseUrl}/appointments.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Key": adminKey,
        },
        body: JSON.stringify({
          adminAction: "update_status",
          id,
          status: nextStatus,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Ne mogu da sacuvam status.");
      }

      setAppointments((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status: nextStatus } : item))
      );
      setStatus({ type: "success", message: "Status je sacuvan." });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Doslo je do greske.";
      setStatus({ type: "error", message });
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  return (
    <AdminShell
      title="Zakazani termini"
      subtitle={`Ukupno termina: ${appointments.length}`}
    >
      <div className="admin-grid">
        <div className="admin-toolbar">
          <button className="button" type="button" onClick={fetchAppointments}>
            Osvezi listu
          </button>
          {status.type !== "idle" && status.message && (
            <div className={`form-status ${status.type}`}>{status.message}</div>
          )}
        </div>

        {appointments.length === 0 && status.type !== "loading" && (
          <div className="admin-card">Nema zakazanih termina.</div>
        )}

        {appointments.map((appointment) => (
          <div key={appointment.id} className="admin-card">
            <div className={`status-pill ${appointment.status || "pending"}`}>
              {statusLabels[appointment.status || "pending"] || appointment.status}
            </div>
            <strong>{appointment.serviceName}</strong>
            <span>
              {appointment.date} | {appointment.time}
            </span>
            <div>{appointment.clientName}</div>
            <span>{appointment.phone}</span>
            {appointment.email && <span>{appointment.email}</span>}
            {appointment.notes && <span>Napomena: {appointment.notes}</span>}
            {appointment.createdAt && <span>Kreirano: {appointment.createdAt}</span>}
            <div className="admin-actions">
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => updateStatus(appointment.id, option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </AdminShell>
  );
}
