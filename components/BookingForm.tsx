"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@heroui/react";

import { services } from "@/lib/services";
import { siteConfig } from "@/lib/site";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";
const DAYS_AHEAD = 14;

type StatusState = {
  type: "idle" | "sending" | "success" | "error";
  message?: string;
};

type AvailabilityState = {
  type: "idle" | "loading" | "error";
  message?: string;
};

type ClientProfile = {
  name: string;
  phone: string;
  email: string;
  token: string;
};

type AvailabilityItem = {
  time: string;
  duration?: string | number;
};

type CalendarDay = {
  value: string | null;
  label: string;
  inMonth: boolean;
  isAvailable: boolean;
};

const formatDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDisplayDate = (value: string) => {
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) {
    return value;
  }
  return `${day}/${month}/${year}`;
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

const addMonths = (date: Date, months: number) =>
  new Date(date.getFullYear(), date.getMonth() + months, 1);

const getMondayIndex = (day: number) => (day + 6) % 7;

const buildCalendarDays = (
  monthDate: Date,
  minDate: Date,
  maxDate: Date
): CalendarDay[] => {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = getMondayIndex(firstOfMonth.getDay());
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;
  const days: CalendarDay[] = [];

  for (let i = 0; i < totalCells; i += 1) {
    const dayNumber = i - startOffset + 1;
    const inMonth = dayNumber >= 1 && dayNumber <= daysInMonth;
    if (!inMonth) {
      days.push({ value: null, label: "", inMonth: false, isAvailable: false });
      continue;
    }

    const date = new Date(year, month, dayNumber);
    const value = formatDate(date);
    const isAvailable = date >= minDate && date <= maxDate;

    days.push({
      value,
      label: String(dayNumber),
      inMonth: true,
      isAvailable,
    });
  }

  return days;
};

const buildSlots = (
  date: string,
  durationMinutes: number,
  appointments: AvailabilityItem[],
  blocks: AvailabilityItem[]
) => {
  const { open, close, slotMinutes } = siteConfig.schedule;
  const openMinutes = timeToMinutes(open);
  const closeMinutes = timeToMinutes(close);
  const now = new Date();
  const isToday = date === formatDate(now);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const required = durationMinutes || slotMinutes;

  const reserved = [...appointments, ...blocks].map((item) => {
    const start = timeToMinutes(item.time);
    const length = parseDurationMinutes(item.duration) || slotMinutes;
    return { start, end: start + length };
  });

  const slots: string[] = [];

  for (let start = openMinutes; start + required <= closeMinutes; start += slotMinutes) {
    if (isToday && start < nowMinutes) {
      continue;
    }

    const end = start + required;
    const overlap = reserved.some((item) => start < item.end && end > item.start);
    if (!overlap) {
      slots.push(minutesToTime(start));
    }
  }

  return slots;
};

export default function BookingForm() {
  const today = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);
  const lastDay = useMemo(() => addDays(today, DAYS_AHEAD - 1), [today]);

  const initialServiceId = services[0]?.id ?? "";
  const [client, setClient] = useState<ClientProfile | null>(null);
  const [formData, setFormData] = useState({
    serviceId: initialServiceId,
    date: formatDate(today),
    time: "",
    note: "",
  });
  const [status, setStatus] = useState<StatusState>({ type: "idle" });
  const [availabilityStatus, setAvailabilityStatus] = useState<AvailabilityState>({
    type: "idle",
  });
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [calendarMonth, setCalendarMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );

  useEffect(() => {
    const token = localStorage.getItem("db_client_token");
    if (!token) {
      return;
    }

    const name = localStorage.getItem("db_client_name") || "";
    const phone = localStorage.getItem("db_client_phone") || "";
    const email = localStorage.getItem("db_client_email") || "";

    setClient({ name, phone, email, token });
  }, []);

  const selectedService = useMemo(
    () => services.find((service) => service.id === formData.serviceId),
    [formData.serviceId]
  );

  const calendarDays = useMemo(
    () => buildCalendarDays(calendarMonth, today, lastDay),
    [calendarMonth, today, lastDay]
  );

  useEffect(() => {
    if (!apiBaseUrl) {
      return;
    }

    if (!formData.date) {
      return;
    }

    setAvailabilityStatus({ type: "loading" });

    const fetchAvailability = async () => {
      try {
        const response = await fetch(
          `${apiBaseUrl}/availability.php?date=${encodeURIComponent(formData.date)}`
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.message || "Ne mogu da proverim dostupnost.");
        }

        const appointments = Array.isArray(data.appointments) ? data.appointments : [];
        const blocks = Array.isArray(data.blocks) ? data.blocks : [];
        const durationMinutes = parseDurationMinutes(selectedService?.duration);
        const slots = buildSlots(formData.date, durationMinutes, appointments, blocks);

        setAvailableSlots(slots);
        setFormData((prev) => ({
          ...prev,
          time: slots.includes(prev.time) ? prev.time : slots[0] ?? "",
        }));
        setAvailabilityStatus({ type: "idle" });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Doslo je do greske.";
        setAvailabilityStatus({ type: "error", message });
        setAvailableSlots([]);
      }
    };

    fetchAvailability();
  }, [apiBaseUrl, formData.date, selectedService?.duration]);

  useEffect(() => {
    const [year, month] = formData.date.split("-").map((part) => Number(part));
    if (!year || !month) {
      return;
    }

    setCalendarMonth(new Date(year, month - 1, 1));
  }, [formData.date]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!client) {
      setStatus({
        type: "error",
        message: "Morate biti ulogovani da biste zakazali termin.",
      });
      return;
    }

    if (!apiBaseUrl) {
      setStatus({
        type: "error",
        message: "API nije podesen. Dodaj NEXT_PUBLIC_API_BASE_URL u .env.",
      });
      return;
    }

    if (!formData.date || !formData.time) {
      setStatus({
        type: "error",
        message: "Izaberite datum i vreme.",
      });
      return;
    }

    setStatus({ type: "sending" });

    const payload = {
      clientName: client.name,
      phone: client.phone,
      email: client.email,
      serviceId: formData.serviceId,
      serviceName: selectedService?.name ?? "",
      duration: selectedService?.duration ?? "",
      price: selectedService?.price ?? 0,
      date: formData.date,
      time: formData.time,
      notes: formData.note.trim(),
      clientToken: client.token,
      source: "web",
    };

    try {
      const response = await fetch(`${apiBaseUrl}/appointments.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Greska pri slanju termina.");
      }

      setStatus({
        type: "success",
        message: "Termin je poslat! Javljamo potvrdu uskoro.",
      });

      setFormData((prev) => ({
        ...prev,
        time: "",
        note: "",
      }));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Doslo je do greske.";
      setStatus({ type: "error", message });
    }
  };

  const servicePrice = selectedService?.price
    ? `RSD ${selectedService.price.toLocaleString("sr-RS")}`
    : "-";

  const canGoPrev = calendarMonth > new Date(today.getFullYear(), today.getMonth(), 1);
  const canGoNext =
    calendarMonth < new Date(lastDay.getFullYear(), lastDay.getMonth(), 1);

  const weekdayLabels = useMemo(() => {
    const base = new Date(2024, 0, 1);
    return Array.from({ length: 7 }).map((_, index) => formatWeekday(addDays(base, index)));
  }, []);

  if (!client) {
    return (
      <div className="booking-locked reveal-on-scroll" data-reveal>
        <div>
          <h3>Prijava je obavezna</h3>
          <p>
            Da bismo sacuvali vase termine i potvrdili rezervaciju, potrebno je
            da budete ulogovani.
          </p>
        </div>
        <div className="hero-actions">
          <Link className="button" href="/login">
            Prijava
          </Link>
          <Link className="button outline" href="/register">
            Registracija
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form className="booking-form reveal-on-scroll" onSubmit={handleSubmit} data-reveal>
      <div className="booking-summary">
        <div>
          <span>Izabrana usluga</span>
          <strong>{selectedService?.name ?? "Izaberi uslugu"}</strong>
        </div>
        <div className="booking-summary__meta">
          <span>Trajanje: {selectedService?.duration ?? "-"}</span>
          <span>Cena: {servicePrice}</span>
        </div>
        <p className="booking-summary__note">
          Ulogovani ste kao {client.name}. Potvrdu termina saljemo u roku od 24h.
        </p>
      </div>

      <div className="form-grid">
        <div className="form-row form-row--full">
          <label htmlFor="serviceId">Usluga</label>
          <select
            id="serviceId"
            name="serviceId"
            className="select"
            value={formData.serviceId}
            onChange={(event) =>
              setFormData((prev) => ({
                ...prev,
                serviceId: event.target.value,
              }))
            }
            required
          >
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name} | {service.duration} | RSD{" "}
                {service.price.toLocaleString("sr-RS")}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="availability-panel">
        <div className="availability-header">
          <div>
            <span>Izabrani datum</span>
            <strong>{formatDisplayDate(formData.date)}</strong>
          </div>
          {availabilityStatus.type === "loading" && <span>Provera...</span>}
          {availabilityStatus.type === "error" && (
            <span>{availabilityStatus.message}</span>
          )}
        </div>

        <div className="calendar">
          <div className="calendar-header">
            <Button
              size="sm"
              variant="bordered"
              className="calendar-nav"
              isDisabled={!canGoPrev}
              onPress={() => setCalendarMonth(addMonths(calendarMonth, -1))}
            >
              Prethodni
            </Button>
            <div className="calendar-title">{formatMonthLabel(calendarMonth)}</div>
            <Button
              size="sm"
              variant="bordered"
              className="calendar-nav"
              isDisabled={!canGoNext}
              onPress={() => setCalendarMonth(addMonths(calendarMonth, 1))}
            >
              Sledeci
            </Button>
          </div>

          <div className="calendar-weekdays">
            {weekdayLabels.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>

          <div className="calendar-grid">
            {calendarDays.map((day, index) => {
              if (!day.inMonth) {
                return <div key={`empty-${index}`} className="calendar-cell" />;
              }

              const isActive = day.value === formData.date;
              const isDisabled = !day.isAvailable;

              return (
                <Button
                  key={day.value}
                  size="sm"
                  variant="flat"
                  radius="sm"
                  className={`calendar-day ${isActive ? "is-active" : ""}`}
                  isDisabled={isDisabled}
                  onPress={() => {
                    if (!day.value) {
                      return;
                    }
                    setFormData((prev) => ({
                      ...prev,
                      date: day.value,
                    }));
                  }}
                >
                  {day.label}
                </Button>
              );
            })}
          </div>
        </div>

        <div className="slot-grid">
          {availableSlots.length === 0 && availabilityStatus.type !== "loading" && (
            <div className="slot-empty">
              Nema dostupnih termina za ovaj dan.
            </div>
          )}
          {availableSlots.map((slot) => (
            <Button
              key={slot}
              size="sm"
              variant="bordered"
              radius="sm"
              className={`slot-button ${slot === formData.time ? "is-active" : ""}`}
              onPress={() => setFormData((prev) => ({ ...prev, time: slot }))}
            >
              {slot}
            </Button>
          ))}
        </div>
      </div>

      <div className="form-row">
        <label htmlFor="note">Napomena</label>
        <textarea
          id="note"
          name="note"
          className="textarea"
          value={formData.note}
          onChange={(event) =>
            setFormData((prev) => ({ ...prev, note: event.target.value }))
          }
          placeholder="Specijalne zelje, stil, dodatne informacije."
        />
      </div>

      {status.type !== "idle" && status.message && (
        <div className={`form-status ${status.type}`}>{status.message}</div>
      )}
      <button
        className="button"
        type="submit"
        disabled={status.type === "sending" || !formData.time}
      >
        {status.type === "sending" ? "Slanje..." : "Posalji zahtev"}
      </button>
    </form>
  );
}
