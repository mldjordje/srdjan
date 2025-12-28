"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";

import AdminShell from "@/components/admin/AdminShell";
import { siteConfig } from "@/lib/site";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";
const adminKey = process.env.NEXT_PUBLIC_ADMIN_KEY || "";
const MONTHS_AHEAD = 12;
const WORKING_DAYS = siteConfig.schedule.workingDays ?? [1, 2, 3, 4, 5];
const WORKING_DAY_ORDER = [...WORKING_DAYS].sort((a, b) => a - b);
const getWorkdayColumn = (day: number) => WORKING_DAY_ORDER.indexOf(day);

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

type CalendarDay = {
  value: string | null;
  label: string;
  inMonth: boolean;
  inRange: boolean;
};

type ScheduleItem = {
  id: string;
  sourceId?: string;
  date: string;
  time: string;
  dayIndex: number;
  startRow: number;
  span: number;
  title: string;
  subtitle?: string;
  duration?: number;
  note?: string;
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

const addMonths = (date: Date, months: number) =>
  new Date(date.getFullYear(), date.getMonth() + months, 1);

const buildCalendarDays = (
  monthDate: Date,
  minDate: Date,
  maxDate: Date
): CalendarDay[] => {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: CalendarDay[] = [];

  let firstWorking = new Date(year, month, 1);
  while (
    firstWorking.getMonth() === month &&
    getWorkdayColumn(firstWorking.getDay()) === -1
  ) {
    firstWorking = addDays(firstWorking, 1);
  }

  const startOffset =
    firstWorking.getMonth() === month ? Math.max(0, getWorkdayColumn(firstWorking.getDay())) : 0;

  for (let i = 0; i < startOffset; i += 1) {
    days.push({ value: null, label: "", inMonth: false, inRange: false });
  }

  for (let dayNumber = 1; dayNumber <= daysInMonth; dayNumber += 1) {
    const date = new Date(year, month, dayNumber);
    if (getWorkdayColumn(date.getDay()) === -1) {
      continue;
    }

    const value = formatDate(date);
    const inRange = isWorkingDay(date) && date >= minDate && date <= maxDate;

    days.push({
      value,
      label: String(dayNumber),
      inMonth: true,
      inRange,
    });
  }

  const totalCells =
    Math.ceil(days.length / WORKING_DAY_ORDER.length) * WORKING_DAY_ORDER.length;
  while (days.length < totalCells) {
    days.push({ value: null, label: "", inMonth: false, inRange: false });
  }

  return days;
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
  const [calendarMonth, setCalendarMonth] = useState(
    new Date(firstWorkingDay.getFullYear(), firstWorkingDay.getMonth(), 1)
  );
  const [appointmentsByDate, setAppointmentsByDate] = useState<
    Record<string, Appointment[]>
  >({});
  const [blocksByDate, setBlocksByDate] = useState<Record<string, Block[]>>({});
  const [status, setStatus] = useState<StatusState>({ type: "idle" });
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<{ date: string; time: string } | null>(
    null
  );
  const blockFormRef = useRef<HTMLFormElement | null>(null);
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
  const weekEnd = useMemo(
    () => addDays(weekStart, WORKING_DAY_ORDER.length - 1),
    [weekStart]
  );
  const weekDays = useMemo(
    () => WORKING_DAY_ORDER.map((dayIndex) => addDays(weekStart, dayIndex - 1)),
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

  const weekdayLabels = useMemo(() => {
    const base = new Date(2024, 0, 1);
    return WORKING_DAY_ORDER.map((dayIndex) => {
      const offset = dayIndex === 0 ? -1 : dayIndex - 1;
      return formatWeekday(addDays(base, offset));
    });
  }, []);

  const gridStyles = useMemo(
    () => ({
      gridTemplateColumns: `repeat(${weekDays.length}, minmax(0, 1fr))`,
      gridTemplateRows: `var(--calendar-header-height) repeat(${slotCount}, var(--calendar-slot-height))`,
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

  const monthDays = useMemo(
    () => buildCalendarDays(calendarMonth, firstWorkingDay, lastDay),
    [calendarMonth, firstWorkingDay, lastDay]
  );

  const minMonth = new Date(firstWorkingDay.getFullYear(), firstWorkingDay.getMonth(), 1);
  const maxMonth = new Date(lastDay.getFullYear(), lastDay.getMonth(), 1);
  const canGoPrevMonth = calendarMonth > minMonth;
  const canGoNextMonth = calendarMonth < maxMonth;

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
          sourceId: appointment.id,
          date: dateKey,
          time: appointment.time,
          dayIndex,
          startRow: rowStart,
          span,
          title: appointment.clientName,
          subtitle: appointment.serviceName,
          duration: durationMinutes,
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
          sourceId: block.id,
          date: dateKey,
          time: block.time,
          dayIndex,
          startRow: rowStart,
          span,
          title: "Blokada",
          subtitle: block.note || `${block.duration} min`,
          duration: block.duration,
          note: block.note,
          type: "block",
        });
      });
    });

    return items;
  }, [weekDays, appointmentsByDate, blocksByDate, open, close, slotMinutes, slotCount]);

  const busySlots = useMemo(() => {
    const map = new Set<string>();
    scheduleItems.forEach((item) => {
      for (let row = item.startRow; row < item.startRow + item.span; row += 1) {
        map.add(`${item.dayIndex}-${row}`);
      }
    });
    return map;
  }, [scheduleItems]);

  const selectedSlotKey = selectedSlot ? `${selectedSlot.date}-${selectedSlot.time}` : null;

  const fetchAppointments = async (date: string) => {
    if (!apiBaseUrl || !adminKey) {
      return [];
    }

    const dateObj = new Date(`${date}T00:00:00`);
    if (!isWorkingDay(dateObj)) {
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

    const dateObj = new Date(`${date}T00:00:00`);
    if (!isWorkingDay(dateObj)) {
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
    if (selectedSlot && selectedSlot.date !== selectedDate) {
      setSelectedSlot(null);
    }
  }, [selectedDate, selectedSlot]);

  useEffect(() => {
    const [year, month] = selectedDate.split("-").map((part) => Number(part));
    if (!year || !month) {
      return;
    }

    setCalendarMonth(new Date(year, month - 1, 1));
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

    if (name === "time") {
      setSelectedSlot({ date: blockForm.date, time: value });
    }
  };

  const handleSlotSelect = (date: string, time: string) => {
    const dateObj = new Date(`${date}T00:00:00`);
    if (!isWorkingDay(dateObj)) {
      return;
    }

    setEditingBlockId(null);
    setSelectedSlot({ date, time });
    setSelectedDate(date);
    setBlockForm((prev) => ({
      ...prev,
      date,
      time,
      duration: prev.duration || String(slotMinutes),
    }));
    blockFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleEditBlock = (block: Block) => {
    setEditingBlockId(block.id);
    setSelectedSlot({ date: block.date, time: block.time });
    setSelectedDate(block.date);
    setBlockForm({
      date: block.date,
      time: block.time,
      duration: String(block.duration),
      note: block.note || "",
    });
    blockFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleCancelEdit = () => {
    setEditingBlockId(null);
    setSelectedSlot(null);
    setBlockForm((prev) => ({
      ...prev,
      time: "",
      duration: "20",
      note: "",
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
      const createResponse = await fetch(`${apiBaseUrl}/blocks.php`, {
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
      const data = await createResponse.json();

      if (!createResponse.ok) {
        throw new Error(data?.message || "Ne mogu da sacuvam blokadu.");
      }

      if (editingBlockId) {
        await fetch(`${apiBaseUrl}/blocks.php?id=${editingBlockId}`, {
          method: "DELETE",
          headers: {
            "X-Admin-Key": adminKey,
          },
        });
      }

      setEditingBlockId(null);
      setSelectedSlot(null);
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

      if (editingBlockId === id) {
        handleCancelEdit();
      }

      await refreshData(weekDateStrings);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Doslo je do greske.";
      setStatus({ type: "error", message });
    }
  };

  const getItemClass = (item: ScheduleItem) => {
    if (item.type === "block") {
      return "calendar-item calendar-item--block is-editable";
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

            <div className="month-picker">
              <div className="month-picker__header">
                <button
                  className="button small outline"
                  type="button"
                  disabled={!canGoPrevMonth}
                  onClick={() => setCalendarMonth(addMonths(calendarMonth, -1))}
                >
                  Prethodni
                </button>
                <div className="month-picker__title">
                  {formatMonthLabel(calendarMonth)}
                </div>
                <button
                  className="button small outline"
                  type="button"
                  disabled={!canGoNextMonth}
                  onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}
                >
                  Sledeci
                </button>
              </div>
              <div className="month-picker__weekdays">
                {weekdayLabels.map((day) => (
                  <span key={day}>{day}</span>
                ))}
              </div>
              <div className="month-picker__grid">
                {monthDays.map((day, index) => {
                  if (!day.inMonth) {
                    return <div key={`empty-${index}`} className="month-day empty" />;
                  }

                  const isActive = day.value === selectedDate;
                  const isDisabled = !day.inRange;

                  return (
                    <button
                      key={day.value}
                      type="button"
                      className={`month-day ${isActive ? "is-active" : ""}`}
                      disabled={isDisabled}
                      onClick={() => {
                        const value = day.value;
                        if (!value) {
                          return;
                        }
                        setSelectedDate(value);
                      }}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <form className="calendar-form" onSubmit={handleCreateBlock} ref={blockFormRef}>
              <h4>{editingBlockId ? "Izmeni blokadu" : "Dodaj blokadu"}</h4>
              {selectedSlot && (
                <div className="calendar-selected-slot">
                  Izabran termin: {selectedSlot.date} | {selectedSlot.time}
                </div>
              )}
              <div className="form-row">
                <label htmlFor="date">Datum</label>
                <input
                  id="date"
                  name="date"
                  className="input"
                  type="date"
                  value={blockForm.date}
                  min={formatDate(firstWorkingDay)}
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
              <div className="calendar-form__actions">
                {editingBlockId && (
                  <button
                    className="button outline"
                    type="button"
                    onClick={handleCancelEdit}
                  >
                    Otkazi izmenu
                  </button>
                )}
                <button className="button" type="submit">
                  {editingBlockId ? "Sacuvaj izmene" : "Sacuvaj blokadu"}
                </button>
              </div>
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
                    weekDays.map((day, colIndex) => {
                      const dateKey = formatDate(day);
                      const rowKey = rowIndex + 2;
                      const isWorkday = isWorkingDay(day);
                      const isBusy = busySlots.has(`${colIndex}-${rowKey}`);
                      const isSelected =
                        selectedSlotKey === `${dateKey}-${slot}` && isWorkday;

                      return (
                        <button
                          key={`${slot}-${colIndex}`}
                          type="button"
                          className={`calendar-slot ${isWorkday ? "" : "is-closed"} ${
                            isBusy ? "is-busy" : ""
                          } ${isSelected ? "is-selected" : ""}`}
                          style={{ gridColumn: colIndex + 1, gridRow: rowIndex + 2 }}
                          disabled={!isWorkday || isBusy}
                          onClick={() => handleSlotSelect(dateKey, slot)}
                        />
                      );
                    })
                  )}

                  {scheduleItems.map((item) => (
                    <div
                      key={item.id}
                      className={getItemClass(item)}
                      style={{
                        gridColumn: item.dayIndex + 1,
                        gridRow: `${item.startRow} / span ${item.span}`,
                      }}
                      onClick={() => {
                        if (item.type !== "block" || !item.sourceId) {
                          return;
                        }
                        handleEditBlock({
                          id: item.sourceId,
                          date: item.date,
                          time: item.time,
                          duration: item.duration || slotMinutes,
                          note: item.note,
                        });
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
                    <div className="admin-actions">
                      <button
                        className="button outline"
                        type="button"
                        onClick={() => handleEditBlock(block)}
                      >
                        Izmeni
                      </button>
                      <button
                        className="button outline"
                        type="button"
                        onClick={() => handleDeleteBlock(block.id)}
                      >
                        Obrisi
                      </button>
                    </div>
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
