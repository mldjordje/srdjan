"use client";

import { useEffect, useState } from "react";

import AdminShell from "@/components/srdjan/admin/AdminShell";
import { formatIsoDateToEuropean } from "@/lib/date";

type Worker = { id: string; name: string; location_id: string };
type Appointment = {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  service_name_snapshot: string;
  clients?: { full_name?: string; phone?: string } | null;
  cancellation_reason?: string | null;
};

const statusOptions = ["pending", "confirmed", "completed", "cancelled", "no_show"];
const toDateInput = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export default function AdminAppointmentsPage() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [workerId, setWorkerId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [date, setDate] = useState(toDateInput(new Date()));
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [cancelForm, setCancelForm] = useState({
    workerId: "",
    date: toDateInput(new Date()),
    reason: "",
  });
  const [status, setStatus] = useState("");

  const loadWorkers = async () => {
    const [bootstrapRes, meRes] = await Promise.all([
      fetch("/api/public/bootstrap", { cache: "no-store" }),
      fetch("/api/admin/me", { cache: "no-store" }),
    ]);
    const bootstrap = await bootstrapRes.json();
    if (!bootstrapRes.ok) {
      throw new Error(bootstrap.error || "Ne mogu da ucitam radnike.");
    }
    const meData = meRes.ok ? await meRes.json() : null;
    const ownWorkerId = (meData?.workerId || "").trim();
    const workerList: Worker[] = bootstrap.workers || [];
    setWorkers(workerList);
    const defaultWorkerId =
      workerList.find((worker) => worker.id === ownWorkerId)?.id || workerList[0]?.id || "";
    setWorkerId(defaultWorkerId);
    setCancelForm((prev) => ({ ...prev, workerId: defaultWorkerId }));
    setLocationId(bootstrap.defaultLocationId || bootstrap.locations?.[0]?.id || "");
  };

  const loadAppointments = async (nextWorkerId = workerId) => {
    if (!nextWorkerId) {
      setAppointments([]);
      return;
    }
    const response = await fetch(
      `/api/admin/appointments?date=${encodeURIComponent(date)}&workerId=${encodeURIComponent(
        nextWorkerId
      )}`,
      { cache: "no-store" }
    );
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Ne mogu da ucitam termine.");
    }
    setAppointments(data.appointments || []);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadWorkers()
      .then(() => undefined)
      .catch((error) => setStatus(error instanceof Error ? error.message : "Greska."));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAppointments().catch((error) => setStatus(error instanceof Error ? error.message : "Greska."));
  }, [workerId, date]);

  const updateStatus = async (id: string, nextStatus: string) => {
    const response = await fetch("/api/admin/appointments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: nextStatus }),
    });
    const data = await response.json();
    if (!response.ok) {
      setStatus(data.error || "Ne mogu da promenim status.");
      return;
    }
    await loadAppointments();
  };

  const cancelWorkerDay = async (event: React.FormEvent) => {
    event.preventDefault();
    const response = await fetch("/api/admin/appointments/cancel-worker-day", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        locationId,
        workerId: cancelForm.workerId,
        date: cancelForm.date,
        reason: cancelForm.reason,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setStatus(data.error || "Masovno otkazivanje nije uspelo.");
      return;
    }
    setStatus(`Otkazano termina: ${data.cancelled}`);
    await loadAppointments();
  };

  return (
    <AdminShell title="Termini">
      <div className="admin-card">
        <h3>Podmeni po clanu staff-a</h3>
        <div className="admin-actions">
          {workers.map((worker) => (
            <button
              key={worker.id}
              className={`button outline small ${workerId === worker.id ? "is-active" : ""}`}
              onClick={() => {
                setWorkerId(worker.id);
                setCancelForm((prev) => ({ ...prev, workerId: worker.id }));
              }}
              type="button"
            >
              {worker.name}
            </button>
          ))}
        </div>
      </div>

      <div className="admin-card">
        <h3>Lista termina</h3>
        <div className="form-row">
          <label>Datum</label>
          <input className="input" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </div>
        {appointments.length === 0 && <p>Nema termina za izabrani filter.</p>}
        {appointments.map((appointment) => (
          <div key={appointment.id} className="admin-card">
            <strong>
              {formatIsoDateToEuropean(appointment.date)} {appointment.start_time}-
              {appointment.end_time}
            </strong>
            <div>{appointment.service_name_snapshot}</div>
            <div>Klijent: {appointment.clients?.full_name || "-"} ({appointment.clients?.phone || "-"})</div>
            <div>Status: {appointment.status}</div>
            {appointment.cancellation_reason && <div>Razlog: {appointment.cancellation_reason}</div>}
            <div className="admin-actions">
              {statusOptions.map((option) => (
                <button
                  key={option}
                  className={`button outline small ${appointment.status === option ? "is-active" : ""}`}
                  type="button"
                  onClick={() => updateStatus(appointment.id, option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="admin-card">
        <h3>Otkazi sve termine radnika za dan</h3>
        <form className="form-grid" onSubmit={cancelWorkerDay}>
          <div className="form-row">
            <label>Radnik</label>
            <select
              className="select"
              value={cancelForm.workerId}
              onChange={(event) => setCancelForm((prev) => ({ ...prev, workerId: event.target.value }))}
            >
              {workers.map((worker) => (
                <option key={worker.id} value={worker.id}>{worker.name}</option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <label>Datum</label>
            <input
              className="input"
              type="date"
              value={cancelForm.date}
              onChange={(event) => setCancelForm((prev) => ({ ...prev, date: event.target.value }))}
            />
          </div>
          <div className="form-row form-row--full">
            <label>Razlog</label>
            <textarea
              className="textarea"
              value={cancelForm.reason}
              onChange={(event) => setCancelForm((prev) => ({ ...prev, reason: event.target.value }))}
              required
            />
          </div>
          <div className="form-row">
            <button className="button" type="submit">Otkazi sve termine</button>
          </div>
        </form>
      </div>

      {status && <p className="form-status success">{status}</p>}
    </AdminShell>
  );
}
