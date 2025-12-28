"use client";

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";

import AdminShell from "@/components/admin/AdminShell";
import { siteConfig } from "@/lib/site";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";
const adminKey = process.env.NEXT_PUBLIC_ADMIN_KEY || "";
const MONTHS_AHEAD = 3;
const WORKING_DAYS = siteConfig.schedule.workingDays ?? [1, 2, 3, 4, 5];

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

type ScheduleItem = {
  id: string;
  dayIndex: number;
  startRow: number;
  span: number;
  title: string;
  subtitle?: string;
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

const formatMonthLabel = (date: Date) =>
  new Intl.DateTimeFormat("sr-RS", {
    month: "long",
    year: "numeric",
  }).format(date);

const formatWeekday = (date: Date) =>
  new Intl.DateTimeFormat("sr-RS", {
    weekday: "short",
  }).format(date);

const formatLongDate = (value: string) => {
  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat("sr-RS", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(date);
};

const formatRangeLabel = (start: Date, end: Date) => {
  const startLabel = new Intl.DateTimeFormat("sr-RS", {
    day: "2-digit",
    month: "short",
  }).format(start);
  const endLabel = new Intl.DateTimeFormat("sr-RS", {
    day: "2-digit",
    month: "short",
  }).format(end);
  return `${startLabel} - ${endLabel}`;
};

const timeToMinutes = (time: string) => {
  const [hours, minutes] = time.split(":").map((part) => Number(part));
  return hours * 60 + minutes;
};

const minutesToTime = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

const parseDurationMinutes = (duration?: string | number) => {
  if (typeof duration === "number") {
    return duration;
  }

  if (!duration) {
    return 0;
  }

  const value = duration.toLowerCase();
  if (value.includes("h")) {
    const number = Number(value.replace(/[^\d.]/g, ""));
    return Number.isFinite(number) ? Math.round(number * 60) : 0;
  }

  const number = Number(value.replace(/[^\d]/g, ""));
  return Number.isFinite(number) ? number : 0;
};

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const isWorkingDay = (date: Date) => WORKING_DAYS.includes(date.getDay());

const getNextWorkingDay = (date: Date) => {
  let cursor = new Date(date);
  while (!isWorkingDay(cursor)) {
    cursor = addDays(cursor, 1);
  }
  return cursor;
};

const addMonthsClamped = (date: Date, months: number) => {
  const year = date.getFullYear();
  const month = date.getMonth() + months;
  const day = date.getDate();
  const lastDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(day, lastDay));
};

const getWeekStart = (date: Date) => {
  const day = date.getDay();
  const diff = (day + 6) % 7;
  return addDays(date, -diff);
};

const buildTimeSlots = (open: string, close: string, stepMinutes: number) => {
  const slots: string[] = [];
  const startMinutes = timeToMinutes(open);
  const endMinutes = timeToMinutes(close);

  for (let minutes = startMinutes; minutes < endMinutes; minutes += stepMinutes) {
    slots.push(minutesToTime(minutes));
  }

  return slots;
};

export default function AdminCalendarPage() {
  const today = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);
  const firstWorkingDay = useMemo(() => getNextWorkingDay(today), [today]);
  const lastDay = useMemo(() => addMonthsClamped(today, MONTHS_AHEAD), [today]);
  const { open, close, slotMinutes } = siteConfig.schedule;

  const [selectedDate, setSelectedDate] = useState(formatDate(firstWorkingDay));
  const [appointmentsByDate, setAppointmentsByDate] = useState<
    Record<string, Appointment[]>
  >({});
  const [blocksByDate, setBlocksByDate] = useState<Record<string, Block[]>>({});
  const [status, setStatus] = useState<StatusState>({ type: "idle" });
  const [blockForm, setBlockForm] = useState({
    date: formatDate(firstWorkingDay),
    time: "",
    duration: "20",
    note: "",
  });

  const selectedDateObj = useMemo(
    () => new Date(`${selectedDate}T00:00:00`),
    [selectedDate]
  );
  const weekStart = useMemo(() => getWeekStart(selectedDateObj), [selectedDateObj]);
  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart]);
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart]
  );
  const weekDateStrings = useMemo(
    () => weekDays.map((day) => formatDate(day)),
    [weekDays]
  );

  const timeSlots = useMemo(
    () => buildTimeSlots(open, close, slotMinutes),
    [open, close, slotMinutes]
  );
  const slotCount = timeSlots.length;

  const gridStyles = useMemo(
    () => ({
      gridTemplateColumns: `repeat(${weekDays.length}, minmax(130px, 1fr))`,
      gridTemplateRows: `var(--calendar-header-height) repeat(${slotCount}, var(--calendar-slot-height))`,
      minWidth: "100%",
    }),
    [weekDays.length, slotCount]
  );

  const timeStyles = useMemo(
    () => ({
      gridTemplateRows: `var(--calendar-header-height) repeat(${slotCount}, var(--calendar-slot-height))`,
    }),
    [slotCount]
  );

  const selectedDateLabel = selectedDate ? formatLongDate(selectedDate) : "";
  const weekRangeLabel = useMemo(
    () => formatRangeLabel(weekStart, weekEnd),
    [weekStart, weekEnd]
  );

  const selectedAppointments = appointmentsByDate[selectedDate] ?? [];
  const selectedBlocks = blocksByDate[selectedDate] ?? [];

  const totalAppointments = useMemo(
    () =>
      Object.values(appointmentsByDate).reduce((sum, list) => sum + list.length, 0),
    [appointmentsByDate]
  );
  const totalBlockedMinutes = useMemo(
    () =>
      Object.values(blocksByDate).reduce(
        (sum, list) => sum + list.reduce((blockSum, block) => blockSum + block.duration, 0),
        0
      ),
    [blocksByDate]
  );

  const canGoPrev = weekStart > firstWorkingDay;
  const canGoNext = addDays(weekStart, 7) <= lastDay;

  const scheduleItems = useMemo(() => {
    const items: ScheduleItem[] = [];
    const openMinutes = timeToMinutes(open);
    const closeMinutes = timeToMinutes(close);

    weekDays.forEach((day, dayIndex) => {
      const dateKey = formatDate(day);
      const dayAppointments = appointmentsByDate[dateKey] ?? [];
      const dayBlocks = blocksByDate[dateKey] ?? [];

      dayAppointments.forEach((appointment) => {
        const startMinutes = timeToMinutes(appointment.time);
        const durationMinutes =
          parseDurationMinutes(appointment.duration) || slotMinutes;

        if (startMinutes < openMinutes || startMinutes >= closeMinutes) {
          return;
        }

        const startIndex = Math.floor((startMinutes - openMinutes) / slotMinutes);
        const rowStart = startIndex + 2;
        const rawSpan = Math.ceil(durationMinutes / slotMinutes);
        const maxSpan = slotCount - startIndex;
        const span = Math.max(1, Math.min(rawSpan, maxSpan));

        items.push({
          id: `appointment-${appointment.id}`,
          dayIndex,
          startRow: rowStart,
          span,
          title: appointment.clientName,
          subtitle: appointment.serviceName,
          type: "appointment",
          status: appointment.status || "pending",
        });
      });

      dayBlocks.forEach((block) => {
        const startMinutes = timeToMinutes(block.time);
        const durationMinutes = block.duration || slotMinutes;

        if (startMinutes < openMinutes || startMinutes >= closeMinutes) {
          return;
        }

        const startIndex = Math.floor((startMinutes - openMinutes) / slotMinutes);
        const rowStart = startIndex + 2;
        const rawSpan = Math.ceil(durationMinutes / slotMinutes);
        const maxSpan = slotCount - startIndex;
        const span = Math.max(1, Math.min(rawSpan, maxSpan));

        items.push({
          id: `block-${block.id}`,
          dayIndex,
          startRow: rowStart,
          span,
          title: "Blokada",
          subtitle: block.note || `${block.duration} min`,
          type: "block",
        });
      });
    });

    return items;
  }, [weekDays, appointmentsByDate, blocksByDate, open, close, slotMinutes, slotCount]);

  const fetchAppointments = async (date: string) => {
    if (!apiBaseUrl || !adminKey) {
      return [];
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
    items.sort((a: Appointment, b: Appointment) => a.time.localeCompare(b.time));
    return items;
  };

  const fetchBlocks = async (date: string) => {
    if (!apiBaseUrl || !adminKey) {
      return [];
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
    items.sort((a: Block, b: Block) => a.time.localeCompare(b.time));
    return items;
  };

  const refreshData = async (dates: string[]) => {
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
      const appointmentEntries = await Promise.all(
        dates.map(async (date) => [date, await fetchAppointments(date)] as const)
      );
      const blockEntries = await Promise.all(
        dates.map(async (date) => [date, await fetchBlocks(date)] as const)
      );

      setAppointmentsByDate(
        Object.fromEntries(appointmentEntries) as Record<string, Appointment[]>
      );
      setBlocksByDate(Object.fromEntries(blockEntries) as Record<string, Block[]>);
      setStatus({ type: "success", message: "Kalendar je osvezen." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Doslo je do greske.";
      setStatus({ type: "error", message });
    }
  };

  useEffect(() => {
    if (!selectedDate) {
      return;
    }

    setBlockForm((prev) => ({ ...prev, date: selectedDate }));
  }, [selectedDate]);

  useEffect(() => {
    if (weekDateStrings.length === 0) {
      return;
    }

    refreshData(weekDateStrings);
  }, [weekDateStrings]);

  const normalizeToWorkingDay = (value: string) => {
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return isWorkingDay(date) ? value : formatDate(getNextWorkingDay(date));
  };

  const handleBlockChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;

    if (name === "date") {
      const normalized = normalizeToWorkingDay(value);
      if (normalized !== value) {
        setStatus({
          type: "error",
          message: "Vikendom ne radimo. Izabran je prvi radni dan.",
        });
      }
      setBlockForm((prev) => ({
        ...prev,
        date: normalized,
      }));
      setSelectedDate(normalized);
      return;
    }

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

    const blockDate = new Date(`${blockForm.date}T00:00:00`);
    if (!isWorkingDay(blockDate)) {
      setStatus({
        type: "error",
        message: "Vikendom ne radimo. Izaberi radni dan.",
      });
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
      await refreshData(weekDateStrings);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Doslo je do greske.";
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

      await refreshData(weekDateStrings);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Doslo je do greske.";
      setStatus({ type: "error", message });
    }
  };

  const getItemClass = (item: ScheduleItem) => {
    if (item.type === "block") {
      return "calendar-item calendar-item--block";
    }

    const statusClass =
      item.status && ["pending", "confirmed", "completed", "cancelled"].includes(item.status)
        ? item.status
        : "pending";
    return `calendar-item calendar-item--${statusClass}`;
  };

  return (
    <AdminShell title="Kalendar" subtitle="Upravljanje dostupnoscu termina">
      <div className="admin-grid">
        <div className="calendar-layout">
          <aside className="calendar-sidebar">
            <div className="calendar-selected">
              <span>Izabrani datum</span>
              <strong>{selectedDateLabel || "Izaberi datum"}</strong>
              <span className="calendar-selected__meta">{selectedDate}</span>
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
                  min={formatDate(today)}
                  max={formatDate(lastDay)}
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
            <div className="calendar-toolbar">
              <div className="calendar-toolbar__title">
                <h2>{formatMonthLabel(weekStart)}</h2>
                <span>{weekRangeLabel}</span>
              </div>
              <div className="calendar-toolbar__stats">
                <div className="calendar-metric">
                  <strong>{totalAppointments}</strong>
                  <span>termina</span>
                </div>
                <div className="calendar-metric">
                  <strong>{totalBlockedMinutes}</strong>
                  <span>min blokirano</span>
                </div>
              </div>
              <div className="calendar-toolbar__actions">
                <button
                  className="button small outline"
                  type="button"
                  disabled={!canGoPrev}
                  onClick={() => setSelectedDate(formatDate(addDays(weekStart, -7)))}
                >
                  Prethodni
                </button>
                <button
                  className="button small ghost"
                  type="button"
                  onClick={() => setSelectedDate(formatDate(getNextWorkingDay(today)))}
                >
                  Danas
                </button>
                <button
                  className="button small outline"
                  type="button"
                  disabled={!canGoNext}
                  onClick={() => setSelectedDate(formatDate(addDays(weekStart, 7)))}
                >
                  Sledeci
                </button>
              </div>
            </div>

            {status.type !== "idle" && status.message && (
              <div className={`form-status ${status.type}`}>{status.message}</div>
            )}

            <div className="calendar-schedule">
              <div className="calendar-schedule__scroll">
                <div className="calendar-schedule__times" style={timeStyles}>
                  <div className="calendar-time-header" />
                  {timeSlots.map((time) => (
                    <div key={time} className="calendar-time">
                      {time}
                    </div>
                  ))}
                </div>

                <div className="calendar-schedule__grid" style={gridStyles}>
                  {weekDays.map((day, index) => {
                    const dateKey = formatDate(day);
                    const isActive = dateKey === selectedDate;
                    const isToday = dateKey === formatDate(today);
                    const isWorkday = isWorkingDay(day);
                    const inRange = day >= today && day <= lastDay && isWorkday;
                    return (
                      <button
                        key={dateKey}
                        type="button"
                        className={`calendar-day-header ${isActive ? "is-active" : ""} ${
                          isToday ? "is-today" : ""
                        } ${isWorkday ? "" : "is-closed"}`}
                        style={{ gridColumn: index + 1, gridRow: 1 }}
                        disabled={!inRange}
                        onClick={() => setSelectedDate(dateKey)}
                      >
                        <span className="calendar-day-number">{day.getDate()}</span>
                        <span className="calendar-day-label">
                          {formatWeekday(day).toUpperCase()}
                        </span>
                      </button>
                    );
                  })}

                  {timeSlots.map((slot, rowIndex) =>
                    weekDays.map((day, colIndex) => (
                      <div
                        key={`${slot}-${colIndex}`}
                        className={`calendar-slot ${isWorkingDay(day) ? "" : "is-closed"}`}
                        style={{ gridColumn: colIndex + 1, gridRow: rowIndex + 2 }}
                      />
                    ))
                  )}

                  {scheduleItems.map((item) => (
                    <div
                      key={item.id}
                      className={getItemClass(item)}
                      style={{
                        gridColumn: item.dayIndex + 1,
                        gridRow: `${item.startRow} / span ${item.span}`,
                      }}
                    >
                      <strong>{item.title}</strong>
                      {item.subtitle && <span>{item.subtitle}</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="calendar-detail-grid">
              <div className="calendar-list">
                <h3>Termini {selectedDateLabel}</h3>
                {selectedAppointments.length === 0 && (
                  <div className="admin-card">Nema termina.</div>
                )}
                {selectedAppointments.map((appointment) => (
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
                <h3>Blokade {selectedDateLabel}</h3>
                {selectedBlocks.length === 0 && <div className="admin-card">Nema blokada.</div>}
                {selectedBlocks.map((block) => (
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
      </div>
    </AdminShell>
  );
}
