"use client";

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";

import AdminShell from "@/components/admin/AdminShell";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";
const adminKey = process.env.NEXT_PUBLIC_ADMIN_KEY || "";
const DAYS_AHEAD = 14;

type Appointment = {
  id: string;
  clientName: string;
  serviceName: string;
  date: string;
  time: string;
  duration?: string;
  status?: string;
};

type Block = {
  id: string;
  date: string;
  time: string;
  duration: number;
  note?: string;
};

type StatusState = {
  type: "idle" | "loading" | "success" | "error";
  message?: string;
};

type TimelineItem = {
  id: string;
  time: string;
  title: string;
  meta?: string;
  type: "appointment" | "block";
  status?: string;
};

const statusLabels: Record<string, string> = {
  pending: "Na cekanju",
  confirmed: "Potvrdjen",
  completed: "Zavrsen",
  cancelled: "Otkazan",
};

const formatDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDateLabel = (date: Date) =>
  new Intl.DateTimeFormat("sr-RS", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(date);

const formatLongDate = (value: string) => {
  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat("sr-RS", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(date);
};

const buildDateOptions = () => {
  const today = new Date();
  const list = [] as { value: string; label: string }[];

  for (let i = 0; i < DAYS_AHEAD; i += 1) {
    const next = new Date(today);
    next.setDate(today.getDate() + i);
    list.push({ value: formatDate(next), label: formatDateLabel(next) });
  }

  return list;
};

export default function AdminCalendarPage() {
  const dateOptions = useMemo(() => buildDateOptions(), []);
  const [selectedDate, setSelectedDate] = useState(dateOptions[0]?.value ?? "");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [status, setStatus] = useState<StatusState>({ type: "idle" });
  const [blockForm, setBlockForm] = useState({
    date: dateOptions[0]?.value ?? "",
    time: "",
    duration: "20",
    note: "",
  });

  const totalBlockedMinutes = useMemo(
    () => blocks.reduce((sum, block) => sum + block.duration, 0),
    [blocks]
  );

  const timelineItems = useMemo<TimelineItem[]>(() => {
    const appointmentItems = appointments.map((appointment) => {
      const metaParts = [appointment.clientName, appointment.duration].filter(Boolean);
      return {
        id: `appointment-${appointment.id}`,
        time: appointment.time,
        title: appointment.serviceName,
        meta: metaParts.join(" | "),
        type: "appointment" as const,
        status: appointment.status || "pending",
      };
    });

    const blockItems = blocks.map((block) => {
      const metaParts = [`${block.duration} min`, block.note].filter(Boolean);
      return {
        id: `block-${block.id}`,
        time: block.time,
        title: "Blokada",
        meta: metaParts.join(" | "),
        type: "block" as const,
      };
    });

    return [...appointmentItems, ...blockItems].sort((a, b) =>
      a.time.localeCompare(b.time)
    );
  }, [appointments, blocks]);

  const selectedDateLabel = selectedDate ? formatLongDate(selectedDate) : "";

  const fetchAppointments = async (date: string) => {
    if (!apiBaseUrl || !adminKey) {
      return;
    }

    const response = await fetch(
      `${apiBaseUrl}/appointments.php?date=${encodeURIComponent(date)}`,
      {
        headers: {
          "X-Admin-Key": adminKey,
        },
      }
    );
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.message || "Ne mogu da preuzmem termine.");
    }

    const items = Array.isArray(data.appointments) ? data.appointments : [];
    items.sort((a: Appointment, b: Appointment) =>
      `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)
    );
    setAppointments(items);
  };

  const fetchBlocks = async (date: string) => {
    if (!apiBaseUrl || !adminKey) {
      return;
    }

    const response = await fetch(
      `${apiBaseUrl}/blocks.php?date=${encodeURIComponent(date)}`,
      {
        headers: {
          "X-Admin-Key": adminKey,
        },
      }
    );
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.message || "Ne mogu da preuzmem blokade.");
    }

    const items = Array.isArray(data.blocks) ? data.blocks : [];
    setBlocks(items);
  };

  const refreshData = async (date: string) => {
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
      await Promise.all([fetchAppointments(date), fetchBlocks(date)]);
      setStatus({ type: "success", message: "Kalendar je osvezen." });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Doslo je do greske.";
      setStatus({ type: "error", message });
    }
  };

  useEffect(() => {
    if (!selectedDate) {
      return;
    }

    setBlockForm((prev) => ({ ...prev, date: selectedDate }));
    refreshData(selectedDate);
  }, [selectedDate]);

  const handleBlockChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setBlockForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCreateBlock = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!apiBaseUrl || !adminKey) {
      return;
    }

    setStatus({ type: "loading" });

    try {
      const response = await fetch(`${apiBaseUrl}/blocks.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Key": adminKey,
        },
        body: JSON.stringify({
          date: blockForm.date,
          time: blockForm.time,
          duration: Number(blockForm.duration),
          note: blockForm.note.trim(),
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Ne mogu da sacuvam blokadu.");
      }

      setBlockForm((prev) => ({ ...prev, time: "", duration: "20", note: "" }));
      await refreshData(selectedDate);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Doslo je do greske.";
      setStatus({ type: "error", message });
    }
  };

  const handleDeleteBlock = async (id: string) => {
    if (!apiBaseUrl || !adminKey) {
      return;
    }

    setStatus({ type: "loading" });

    try {
      const response = await fetch(`${apiBaseUrl}/blocks.php?id=${id}`, {
        method: "DELETE",
        headers: {
          "X-Admin-Key": adminKey,
        },
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Ne mogu da obrisem blokadu.");
      }

      await refreshData(selectedDate);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Doslo je do greske.";
      setStatus({ type: "error", message });
    }
  };

  return (
    <AdminShell title="Kalendar" subtitle="Upravljanje dostupnoscu termina">
      <div className="admin-grid">
        {status.type !== "idle" && status.message && (
          <div className={`form-status ${status.type}`}>{status.message}</div>
        )}

        <div className="calendar-layout">
          <aside className="calendar-sidebar">
            <div>
              <h3>Izaberi datum</h3>
              <div className="date-grid">
                {dateOptions.map((date) => (
                  <button
                    key={date.value}
                    type="button"
                    className={`date-card ${date.value === selectedDate ? "is-active" : ""}`}
                    onClick={() => setSelectedDate(date.value)}
                  >
                    <span>{date.label}</span>
                    <strong>{date.value}</strong>
                  </button>
                ))}
              </div>
            </div>

            <form className="calendar-form" onSubmit={handleCreateBlock}>
              <h4>Dodaj blokadu</h4>
              <div className="form-row">
                <label htmlFor="date">Datum</label>
                <input
                  id="date"
                  name="date"
                  className="input"
                  type="date"
                  value={blockForm.date}
                  onChange={handleBlockChange}
                  required
                />
              </div>
              <div className="form-row">
                <label htmlFor="time">Vreme</label>
                <input
                  id="time"
                  name="time"
                  className="input"
                  type="time"
                  value={blockForm.time}
                  onChange={handleBlockChange}
                  required
                />
              </div>
              <div className="form-row">
                <label htmlFor="duration">Trajanje (min)</label>
                <input
                  id="duration"
                  name="duration"
                  className="input"
                  type="number"
                  min="10"
                  step="10"
                  value={blockForm.duration}
                  onChange={handleBlockChange}
                  required
                />
              </div>
              <div className="form-row">
                <label htmlFor="note">Napomena</label>
                <input
                  id="note"
                  name="note"
                  className="input"
                  value={blockForm.note}
                  onChange={handleBlockChange}
                />
              </div>
              <button className="button" type="submit">
                Sacuvaj blokadu
              </button>
            </form>
          </aside>

          <div className="calendar-main">
            <div className="calendar-summary">
              <div className="summary-card">
                <span>Datum</span>
                <strong>{selectedDateLabel || "Izaberi datum"}</strong>
                <span className="summary-sub">{selectedDate}</span>
              </div>
              <div className="summary-card">
                <span>Zakazano</span>
                <strong>{appointments.length}</strong>
                <span className="summary-sub">termina</span>
              </div>
              <div className="summary-card">
                <span>Blokirano</span>
                <strong>{blocks.length}</strong>
                <span className="summary-sub">{totalBlockedMinutes} min</span>
              </div>
            </div>

            <div className="calendar-timeline">
              <div className="calendar-timeline__header">
                <h3>Raspored dana</h3>
                <span>{timelineItems.length} stavki</span>
              </div>
              {timelineItems.length === 0 && (
                <div className="admin-card">Nema stavki za izabrani datum.</div>
              )}
              {timelineItems.length > 0 && (
                <div className="timeline-list">
                  {timelineItems.map((item) => (
                    <div key={item.id} className={`timeline-item ${item.type}`}>
                      <div className="timeline-time">{item.time}</div>
                      <div className="timeline-body">
                        <strong>{item.title}</strong>
                        {item.meta && <span>{item.meta}</span>}
                      </div>
                      {item.type === "appointment" ? (
                        <div className={`status-pill ${item.status || "pending"}`}>
                          {statusLabels[item.status || "pending"] || item.status}
                        </div>
                      ) : (
                        <div className="timeline-tag">Blokada</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="calendar-list">
              <h3>Termini</h3>
              {appointments.length === 0 && <div className="admin-card">Nema termina.</div>}
              {appointments.map((appointment) => (
                <div key={appointment.id} className="admin-card">
                  <div className={`status-pill ${appointment.status || "pending"}`}>
                    {statusLabels[appointment.status || "pending"] || appointment.status}
                  </div>
                  <strong>{appointment.serviceName}</strong>
                  <span>
                    {appointment.time} | {appointment.clientName}
                  </span>
                </div>
              ))}
            </div>

            <div className="calendar-list">
              <h3>Blokade</h3>
              {blocks.length === 0 && <div className="admin-card">Nema blokada.</div>}
              {blocks.map((block) => (
                <div key={block.id} className="admin-card">
                  <strong>
                    {block.time} ({block.duration} min)
                  </strong>
                  {block.note && <span>{block.note}</span>}
                  <button
                    className="button outline"
                    type="button"
                    onClick={() => handleDeleteBlock(block.id)}
                  >
                    Obrisi
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
