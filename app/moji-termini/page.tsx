"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatIsoDateToEuropean } from "@/lib/date";

type Appointment = {
  id: string;
  service_name_snapshot: string;
  duration_min_snapshot: number;
  price_snapshot: number;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  cancellation_reason: string | null;
  workers?: { name?: string } | null;
};

export default function MyAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/public/my-appointments", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Niste prijavljeni.");
      }
      setAppointments(Array.isArray(data.appointments) ? data.appointments : []);
    } catch (error) {
      setAppointments([]);
      setError(error instanceof Error ? error.message : "Greska.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <main className="container" style={{ paddingTop: 24, paddingBottom: 48 }}>
      <header style={{ marginBottom: 20 }}>
        <h1>Moji termini</h1>
        <div className="admin-actions">
          <button className="button outline" onClick={load}>Osvezi</button>
          <Link className="button outline" href="/">Nazad na zakazivanje</Link>
        </div>
      </header>

      {loading && <p>Ucitavanje...</p>}
      {!loading && error && <p className="form-status error">{error}</p>}
      {!loading && !error && appointments.length === 0 && <p>Nema termina.</p>}

      {!loading &&
        !error &&
        appointments.map((appointment) => (
          <article key={appointment.id} className="admin-card">
            <strong>{appointment.service_name_snapshot}</strong>
            <div>
              {formatIsoDateToEuropean(appointment.date)} {appointment.start_time} -{" "}
              {appointment.end_time}
            </div>
            <div>Radnik: {appointment.workers?.name || "-"}</div>
            <div>Status: {appointment.status}</div>
            <div>Cena: {appointment.price_snapshot} RSD</div>
            {appointment.cancellation_reason && (
              <div>Razlog otkazivanja: {appointment.cancellation_reason}</div>
            )}
          </article>
        ))}
    </main>
  );
}
