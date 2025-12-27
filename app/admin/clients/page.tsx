"use client";

import { useEffect, useState } from "react";

import AdminShell from "@/components/admin/AdminShell";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";
const adminKey = process.env.NEXT_PUBLIC_ADMIN_KEY || "";

type Client = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  createdAt?: string;
  appointmentCount?: number;
  lastAppointment?: string;
};

type StatusState = {
  type: "idle" | "loading" | "success" | "error";
  message?: string;
};

export default function AdminClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [status, setStatus] = useState<StatusState>({ type: "idle" });

  const fetchClients = async () => {
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
      const response = await fetch(`${apiBaseUrl}/clients.php`, {
        headers: {
          "X-Admin-Key": adminKey,
        },
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Ne mogu da preuzmem klijente.");
      }

      const items = Array.isArray(data.clients) ? data.clients : [];
      setClients(items);
      setStatus({ type: "success", message: "Lista klijenata je osvezena." });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Doslo je do greske.";
      setStatus({ type: "error", message });
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  return (
    <AdminShell
      title="Klijenti"
      subtitle={`Ukupno klijenata: ${clients.length}`}
    >
      <div className="admin-grid">
        <div className="admin-toolbar">
          <button className="button" type="button" onClick={fetchClients}>
            Osvezi listu
          </button>
          {status.type !== "idle" && status.message && (
            <div className={`form-status ${status.type}`}>{status.message}</div>
          )}
        </div>

        {clients.length === 0 && status.type !== "loading" && (
          <div className="admin-card">Nema registrovanih klijenata.</div>
        )}

        {clients.map((client) => (
          <div key={client.id} className="admin-card">
            <strong>{client.name}</strong>
            <span>{client.phone}</span>
            {client.email && <span>{client.email}</span>}
            {client.appointmentCount !== undefined && (
              <span>Broj termina: {client.appointmentCount}</span>
            )}
            {client.lastAppointment && <span>Poslednji termin: {client.lastAppointment}</span>}
            {client.createdAt && <span>Registracija: {client.createdAt}</span>}
          </div>
        ))}
      </div>
    </AdminShell>
  );
}
