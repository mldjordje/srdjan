"use client";

import { useEffect, useState } from "react";

import AdminShell from "@/components/srdjan/admin/AdminShell";

type Worker = { id: string; name: string; location_id: string };
type CalendarPayload = {
  appointments: {
    id: string;
    date: string;
    start_time: string;
    end_time: string;
    status: string;
    service_name_snapshot: string;
    clients?: { full_name?: string; phone?: string } | null;
  }[];
  blocks: {
    id: string;
    date: string;
    start_time: string;
    end_time: string;
    note?: string;
  }[];
};

const toDateInput = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export default function AdminCalendarPage() {
  const [initialDates] = useState(() => {
    const start = new Date();
    const end = new Date(start.getTime() + 6 * 24 * 3600 * 1000);
    return {
      from: toDateInput(start),
      to: toDateInput(end),
      today: toDateInput(start),
    };
  });
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [locationId, setLocationId] = useState("");
  const [workerId, setWorkerId] = useState("");
  const [from, setFrom] = useState(initialDates.from);
  const [to, setTo] = useState(initialDates.to);
  const [calendar, setCalendar] = useState<CalendarPayload>({ appointments: [], blocks: [] });
  const [status, setStatus] = useState("");
  const [shiftForm, setShiftForm] = useState({
    workerId: "",
    date: initialDates.today,
    shiftType: "morning",
  });
  const [swapForm, setSwapForm] = useState({
    date: initialDates.today,
    workerAId: "",
    workerBId: "",
  });

  const loadWorkers = async () => {
    const bootstrapResponse = await fetch("/api/public/bootstrap");
    const bootstrapData = await bootstrapResponse.json();
    if (!bootstrapResponse.ok) {
      throw new Error(bootstrapData.error || "Ne mogu da ucitam podatke.");
    }
    const currentLocationId =
      bootstrapData.defaultLocationId || bootstrapData.locations?.[0]?.id || "";
    setLocationId(currentLocationId);
    const workerList: Worker[] = Array.isArray(bootstrapData.workers) ? bootstrapData.workers : [];
    setWorkers(workerList);
    const defaultWorker = workerList[0]?.id || "";
    setWorkerId(defaultWorker);
    setShiftForm((prev) => ({ ...prev, workerId: defaultWorker }));
    setSwapForm((prev) => ({ ...prev, workerAId: defaultWorker, workerBId: workerList[1]?.id || defaultWorker }));
  };

  const loadCalendar = async (nextWorkerId = workerId) => {
    if (!nextWorkerId) {
      return;
    }
    const response = await fetch(
      `/api/admin/workers/${encodeURIComponent(nextWorkerId)}/calendar?from=${encodeURIComponent(
        from
      )}&to=${encodeURIComponent(to)}`
    );
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Ne mogu da ucitam kalendar.");
    }
    setCalendar({
      appointments: data.appointments || [],
      blocks: data.blocks || [],
    });
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadWorkers()
      .then(() => undefined)
      .catch((error) => setStatus(error instanceof Error ? error.message : "Greska."));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadCalendar().catch((error) => setStatus(error instanceof Error ? error.message : "Greska."));
  }, [workerId, from, to]);

  const saveShift = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus("");
    const response = await fetch("/api/admin/shifts/week", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        locationId,
        shifts: [
          {
            workerId: shiftForm.workerId,
            date: shiftForm.date,
            shiftType: shiftForm.shiftType,
          },
        ],
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setStatus(data.error || "Ne mogu da sacuvam smenu.");
      return;
    }
    setStatus("Smena je sacuvana.");
  };

  const swapShifts = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus("");
    const response = await fetch("/api/admin/shifts/swap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        locationId,
        date: swapForm.date,
        workerAId: swapForm.workerAId,
        workerBId: swapForm.workerBId,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setStatus(data.error || "Zamena smena nije uspela.");
      return;
    }
    setStatus("Smena je zamenjena.");
  };

  return (
    <AdminShell title="Kalendar">
      <div className="admin-card">
        <h3>Podmeni po clanu staff-a</h3>
        <div className="admin-actions">
          {workers.map((worker) => (
            <button
              key={worker.id}
              className={`button outline small ${workerId === worker.id ? "is-active" : ""}`}
              onClick={() => setWorkerId(worker.id)}
              type="button"
            >
              {worker.name}
            </button>
          ))}
        </div>
      </div>

      <div className="admin-card">
        <h3>Pregled kalendara</h3>
        <div className="form-grid">
          <div className="form-row">
            <label>Od</label>
            <input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="form-row">
            <label>Do</label>
            <input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="form-row">
            <button className="button outline" onClick={() => loadCalendar()} type="button">Osvezi</button>
          </div>
        </div>
        <h4>Termini ({calendar.appointments.length})</h4>
        {calendar.appointments.map((item) => (
          <div key={item.id} className="admin-card">
            <strong>{item.date} {item.start_time}-{item.end_time}</strong>
            <div>{item.service_name_snapshot}</div>
            <div>Klijent: {item.clients?.full_name || "-"} ({item.clients?.phone || "-"})</div>
            <div>Status: {item.status}</div>
          </div>
        ))}
        <h4>Blokade ({calendar.blocks.length})</h4>
        {calendar.blocks.map((item) => (
          <div key={item.id} className="admin-card">
            <strong>{item.date} {item.start_time}-{item.end_time}</strong>
            {item.note && <div>{item.note}</div>}
          </div>
        ))}
      </div>

      <div className="admin-card">
        <h3>Planiranje smena (petak/naredna nedelja ili ad-hoc)</h3>
        <form className="form-grid" onSubmit={saveShift}>
          <div className="form-row">
            <label>Radnik</label>
            <select
              className="select"
              value={shiftForm.workerId}
              onChange={(event) => setShiftForm((prev) => ({ ...prev, workerId: event.target.value }))}
            >
              {workers.map((worker) => (
                <option key={worker.id} value={worker.id}>
                  {worker.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <label>Datum</label>
            <input
              className="input"
              type="date"
              value={shiftForm.date}
              onChange={(event) => setShiftForm((prev) => ({ ...prev, date: event.target.value }))}
            />
          </div>
          <div className="form-row">
            <label>Smena</label>
            <select
              className="select"
              value={shiftForm.shiftType}
              onChange={(event) => setShiftForm((prev) => ({ ...prev, shiftType: event.target.value }))}
            >
              <option value="morning">Prepodne</option>
              <option value="afternoon">Popodne</option>
              <option value="off">Slobodan dan</option>
            </select>
          </div>
          <div className="form-row">
            <button className="button" type="submit">Sacuvaj smenu</button>
          </div>
        </form>
      </div>

      <div className="admin-card">
        <h3>Zamena smena (dozvoljena samo ako oba radnika imaju 0 termina)</h3>
        <form className="form-grid" onSubmit={swapShifts}>
          <div className="form-row">
            <label>Datum</label>
            <input
              className="input"
              type="date"
              value={swapForm.date}
              onChange={(event) => setSwapForm((prev) => ({ ...prev, date: event.target.value }))}
            />
          </div>
          <div className="form-row">
            <label>Radnik A</label>
            <select
              className="select"
              value={swapForm.workerAId}
              onChange={(event) => setSwapForm((prev) => ({ ...prev, workerAId: event.target.value }))}
            >
              {workers.map((worker) => (
                <option key={worker.id} value={worker.id}>
                  {worker.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <label>Radnik B</label>
            <select
              className="select"
              value={swapForm.workerBId}
              onChange={(event) => setSwapForm((prev) => ({ ...prev, workerBId: event.target.value }))}
            >
              {workers.map((worker) => (
                <option key={worker.id} value={worker.id}>
                  {worker.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <button className="button" type="submit">Zameni smene</button>
          </div>
        </form>
      </div>

      {status && <p className="form-status success">{status}</p>}
    </AdminShell>
  );
}
