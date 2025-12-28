"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@heroui/react";

import { services } from "@/lib/services";
import { siteConfig } from "@/lib/site";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";
const MONTHS_AHEAD = 3;
const WORKING_DAYS = siteConfig.schedule.workingDays ?? [1, 2, 3, 4, 5];

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

type Appointment = {
  id: string;
  serviceName: string;
  date: string;
  time: string;
  status?: string;
};

type AvailabilityItem = {
  time: string;
  duration?: string | number;
};

type CalendarDay = {
  value: string | null;
  label: string;
  inMonth: boolean;
  inRange: boolean;
};

const formatDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatLongDate = (value: string) => {
  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat("sr-RS", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
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

const formatSlotLabel = (time: string) => {
  const [hours, minutes] = time.split(":").map((part) => Number(part));
  const date = new Date(2024, 0, 1, hours, minutes);
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
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
      days.push({ value: null, label: "", inMonth: false, inRange: false });
      continue;
    }

    const date = new Date(year, month, dayNumber);
    const value = formatDate(date);
    const inRange = isWorkingDay(date) && date >= minDate && date <= maxDate;

    days.push({
      value,
      label: String(dayNumber),
      inMonth: true,
      inRange,
    });
  }

  return days;
};

const buildDateRange = (startDate: Date, endDate: Date) => {
  const dates: string[] = [];
  let cursor = new Date(startDate);

  while (cursor <= endDate) {
    dates.push(formatDate(cursor));
    cursor = addDays(cursor, 1);
  }

  return dates;
};

const buildSlots = (
  date: string,
  durationMinutes: number,
  appointments: AvailabilityItem[],
  blocks: AvailabilityItem[]
) => {
  const dateObj = new Date(`${date}T00:00:00`);
  if (!isWorkingDay(dateObj)) {
    return [];
  }

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

  const stepMinutes = Math.max(slotMinutes, required);

  for (let start = openMinutes; start + required <= closeMinutes; start += stepMinutes) {
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
  const [activeStep, setActiveStep] = useState<1 | 2>(1);
  const today = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);
  const firstWorkingDay = useMemo(() => getNextWorkingDay(today), [today]);
  const lastDay = useMemo(() => addMonthsClamped(today, MONTHS_AHEAD), [today]);
  const dateList = useMemo(
    () =>
      buildDateRange(firstWorkingDay, lastDay).filter((value) =>
        isWorkingDay(new Date(`${value}T00:00:00`))
      ),
    [firstWorkingDay, lastDay]
  );

  const [client, setClient] = useState<ClientProfile | null>(null);
  const [clientAppointments, setClientAppointments] = useState<Appointment[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [formData, setFormData] = useState({
    serviceId: "",
    date: formatDate(firstWorkingDay),
    time: "",
    note: "",
  });
  const [status, setStatus] = useState<StatusState>({ type: "idle" });
  const [availabilityStatus, setAvailabilityStatus] = useState<AvailabilityState>({
    type: "idle",
  });
  const [availabilityByDate, setAvailabilityByDate] = useState<
    Record<string, string[]>
  >({});
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [calendarMonth, setCalendarMonth] = useState(
    new Date(firstWorkingDay.getFullYear(), firstWorkingDay.getMonth(), 1)
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

  const fetchClientAppointments = async (token: string) => {
    if (!apiBaseUrl) {
      return;
    }

    setLoadingAppointments(true);
    try {
      const response = await fetch(
        `${apiBaseUrl}/appointments.php?clientToken=${encodeURIComponent(token)}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Ne mogu da preuzmem termine.");
      }

      const items = Array.isArray(data.appointments) ? data.appointments : [];
      items.sort((a: Appointment, b: Appointment) =>
        `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)
      );
      setClientAppointments(items);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Doslo je do greske.";
      setStatus({ type: "error", message });
    } finally {
      setLoadingAppointments(false);
    }
  };

  useEffect(() => {
    if (!client?.token) {
      return;
    }

    fetchClientAppointments(client.token);
  }, [client?.token]);

  const selectedService = useMemo(
    () => services.find((service) => service.id === formData.serviceId),
    [formData.serviceId]
  );

  const calendarDays = useMemo(
    () => buildCalendarDays(calendarMonth, firstWorkingDay, lastDay),
    [calendarMonth, firstWorkingDay, lastDay]
  );

  useEffect(() => {
    if (!apiBaseUrl || !selectedService) {
      setAvailabilityByDate({});
      setAvailableSlots([]);
      setAvailabilityStatus({ type: "idle" });
      return;
    }

    let active = true;
    setAvailabilityStatus({ type: "loading" });

    const durationMinutes = parseDurationMinutes(selectedService.duration);

    const fetchForDate = async (date: string) => {
      const response = await fetch(
        `${apiBaseUrl}/availability.php?date=${encodeURIComponent(date)}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Ne mogu da proverim dostupnost.");
      }

      const appointments = Array.isArray(data.appointments) ? data.appointments : [];
      const blocks = Array.isArray(data.blocks) ? data.blocks : [];
      const slots = buildSlots(date, durationMinutes, appointments, blocks);

      return [date, slots] as const;
    };

    Promise.all(dateList.map((date) => fetchForDate(date)))
      .then((entries) => {
        if (!active) {
          return;
        }

        const map: Record<string, string[]> = {};
        entries.forEach(([date, slots]) => {
          map[date] = slots;
        });
        setAvailabilityByDate(map);
        setAvailabilityStatus({ type: "idle" });
      })
      .catch((error) => {
        if (!active) {
          return;
        }

        const message =
          error instanceof Error ? error.message : "Doslo je do greske.";
        setAvailabilityStatus({ type: "error", message });
        setAvailabilityByDate({});
      });

    return () => {
      active = false;
    };
  }, [apiBaseUrl, dateList, selectedService?.duration, selectedService?.id]);

  useEffect(() => {
    if (!selectedService) {
      setAvailableSlots([]);
      return;
    }

    const slots = availabilityByDate[formData.date] ?? [];
    setAvailableSlots(slots);
    setFormData((prev) => ({
      ...prev,
      time: slots.includes(prev.time) ? prev.time : slots[0] ?? "",
    }));
  }, [availabilityByDate, formData.date, selectedService?.id]);

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

    if (!selectedService) {
      setStatus({
        type: "error",
        message: "Izaberite uslugu pre zakazivanja.",
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

    const bookingDate = new Date(`${formData.date}T00:00:00`);
    if (!isWorkingDay(bookingDate)) {
      setStatus({
        type: "error",
        message: "Vikendom ne radimo. Izaberi radni dan.",
      });
      return;
    }

    setStatus({ type: "sending" });

    const payload = {
      clientName: client.name,
      phone: client.phone,
      email: client.email,
      serviceId: formData.serviceId,
      serviceName: selectedService.name,
      duration: selectedService.duration,
      price: selectedService.price,
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
      if (client?.token) {
        fetchClientAppointments(client.token);
      }

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

  const canGoPrev =
    calendarMonth > new Date(firstWorkingDay.getFullYear(), firstWorkingDay.getMonth(), 1);
  const canGoNext =
    calendarMonth < new Date(lastDay.getFullYear(), lastDay.getMonth(), 1);

  const weekdayLabels = useMemo(() => {
    const base = new Date(2024, 0, 1);
    return Array.from({ length: 7 }).map((_, index) => formatWeekday(addDays(base, index)));
  }, []);

  const selectedDateLabel = formData.date ? formatLongDate(formData.date) : "";
  const morningSlots = availableSlots.filter((slot) => timeToMinutes(slot) < 12 * 60);
  const afternoonSlots = availableSlots.filter((slot) => timeToMinutes(slot) >= 12 * 60);

  const upcomingAppointments = useMemo(() => {
    const now = new Date();
    return clientAppointments
      .filter((appointment) => appointment.status !== "cancelled")
      .map((appointment) => ({
        ...appointment,
        dateTime: new Date(`${appointment.date}T${appointment.time}:00`),
      }))
      .filter((appointment) => appointment.dateTime >= now)
      .sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime())
      .slice(0, 2);
  }, [clientAppointments]);

  if (!client) {
    return (
      <div className="booking-locked">
        <div>
          <h3>Prijava je obavezna</h3>
          <p>Za zakazivanje je potrebna prijava.</p>
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
    <form className="booking-form" data-step={activeStep} onSubmit={handleSubmit}>
      <div className="booking-header">
        <div>
          <h3>Zakazi termin</h3>
          <p>Izaberi uslugu, datum i vreme.</p>
        </div>
        <div className="booking-user">
          <span>Ulogovani ste</span>
          <strong>{client.name}</strong>
        </div>
      </div>

      <div className="booking-stepper">
        <button
          className={`booking-step ${activeStep === 1 ? "is-active" : ""}`}
          type="button"
          onClick={() => setActiveStep(1)}
        >
          1. Usluga
        </button>
        <button
          className={`booking-step ${activeStep === 2 ? "is-active" : ""}`}
          type="button"
          onClick={() => setActiveStep(2)}
        >
          2. Termin
        </button>
      </div>

      {client && (
        <div className="booking-upcoming">
          <div className="booking-upcoming__header">
            <span>Vas sledeci termin</span>
            <button
              className="button small ghost"
              type="button"
              disabled={loadingAppointments}
              onClick={() => fetchClientAppointments(client.token)}
            >
              {loadingAppointments ? "Ucitavanje..." : "Osvezi"}
            </button>
          </div>
          {upcomingAppointments.length === 0 && !loadingAppointments && (
            <div className="booking-upcoming__empty">Nema zakazanih termina.</div>
          )}
          {upcomingAppointments.map((appointment) => (
            <div key={appointment.id} className="booking-upcoming__item">
              <strong>{appointment.serviceName}</strong>
              <span>
                {formatLongDate(appointment.date)} | {appointment.time}
              </span>
              {appointment.status && <em>{appointment.status}</em>}
            </div>
          ))}
        </div>
      )}

      <div className="booking-steps">
        <section className="booking-panel" data-step="1">
          <div className="booking-panel__header">
            <span className="step-pill">01</span>
            <div>
              <h4>Izaberi uslugu</h4>
              <p>Termini se prilagodjavaju trajanju usluge.</p>
            </div>
          </div>
          <div className="service-list">
            {services.map((service) => {
              const isActive = service.id === formData.serviceId;
              return (
                <button
                  key={service.id}
                  type="button"
                  className={`service-option ${isActive ? "is-active" : ""}`}
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      serviceId: service.id,
                      time: "",
                    }))
                  }
                >
                  <div className="service-info">
                    <strong>{service.name}</strong>
                    <span>
                      {service.duration} | RSD {service.price.toLocaleString("sr-RS")}
                    </span>
                  </div>
                  <span className="service-action">
                    {isActive ? "Izabrano" : "Izaberi"}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="booking-step-actions">
            <span />
            <button
              className="button"
              type="button"
              disabled={!selectedService}
              onClick={() => setActiveStep(2)}
            >
              Nastavi
            </button>
          </div>
        </section>

        <section className="booking-panel" data-step="2">
          <div className="booking-panel__header">
            <span className="step-pill">02</span>
            <div>
              <h4>Izaberi datum i vreme</h4>
              <p>Izaberi datum i vreme koje ti odgovara.</p>
            </div>
          </div>

          {!selectedService && (
            <div className="booking-empty">Prvo izaberi uslugu da bi video kalendar.</div>
          )}

          {selectedService && (
            <>
              <div className="booking-meta">
                <div>
                  <span>Izabrana usluga</span>
                  <strong>{selectedService.name}</strong>
                </div>
                <div>
                  <span>Trajanje</span>
                  <strong>{selectedService.duration}</strong>
                </div>
                <div>
                  <span>Cena</span>
                  <strong>{servicePrice}</strong>
                </div>
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
                    const slots = day.value ? availabilityByDate[day.value] : undefined;
                    const hasSlots = slots ? slots.length > 0 : false;
                    const isDisabled = !day.inRange || (slots !== undefined && slots.length === 0);

                    return (
                      <Button
                        key={day.value}
                        size="sm"
                        variant="flat"
                        radius="sm"
                        className={`calendar-day ${isActive ? "is-active" : ""}`}
                        isDisabled={isDisabled}
                        onPress={() => {
                          const value = day.value;
                          if (!value) {
                            return;
                          }
                          setFormData((prev) => ({
                            ...prev,
                            date: value,
                          }));
                        }}
                      >
                        <span>{day.label}</span>
                        {day.inRange && (
                          <span
                            className={`calendar-indicator ${
                              slots === undefined
                                ? "is-loading"
                                : hasSlots
                                ? "is-available"
                                : "is-full"
                            }`}
                          />
                        )}
                      </Button>
                    );
                  })}
                </div>
              </div>

              <div className="slot-section">
                <div className="slot-header">
                  <h4>Dostupno {selectedDateLabel} (GMT+1)</h4>
                  {availabilityStatus.type === "loading" && <span>Ucitavanje...</span>}
                  {availabilityStatus.type === "error" && (
                    <span>{availabilityStatus.message}</span>
                  )}
                </div>

                {availableSlots.length === 0 && availabilityStatus.type !== "loading" && (
                  <div className="slot-empty">Nema dostupnih termina za ovaj dan.</div>
                )}

                {availableSlots.length > 0 && (
                  <div className="slot-groups">
                    <div className="slot-group">
                      <span>Jutro</span>
                      <div className="slot-items">
                        {morningSlots.length === 0 && (
                          <div className="slot-empty">Nema jutarnjih termina.</div>
                        )}
                        {morningSlots.map((slot) => (
                          <Button
                            key={slot}
                            size="sm"
                            variant="bordered"
                            radius="sm"
                            className={`slot-button ${
                              slot === formData.time ? "is-active" : ""
                            }`}
                            onPress={() =>
                              setFormData((prev) => ({ ...prev, time: slot }))
                            }
                          >
                            {formatSlotLabel(slot)}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <div className="slot-group">
                      <span>Popodne</span>
                      <div className="slot-items">
                        {afternoonSlots.length === 0 && (
                          <div className="slot-empty">Nema popodnevnih termina.</div>
                        )}
                        {afternoonSlots.map((slot) => (
                          <Button
                            key={slot}
                            size="sm"
                            variant="bordered"
                            radius="sm"
                            className={`slot-button ${
                              slot === formData.time ? "is-active" : ""
                            }`}
                            onPress={() =>
                              setFormData((prev) => ({ ...prev, time: slot }))
                            }
                          >
                            {formatSlotLabel(slot)}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
          <div className="booking-step-actions">
            <button
              className="button outline"
              type="button"
              onClick={() => setActiveStep(1)}
            >
              Nazad
            </button>
            <span />
          </div>
        </section>
      </div>

      <section className="booking-panel" data-step="3">
        <div className="booking-panel__header">
          <span className="step-pill">03</span>
          <div>
            <h4>Napomena</h4>
            <p>Dodaj detalje koji nam pomazu oko pripreme.</p>
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
          {status.type === "sending" ? "Slanje..." : "Potvrdi termin"}
        </button>
      </section>
    </form>
  );
}
