"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type ClientProfile = {
  id: string;
  fullName: string;
  phone: string;
  email: string;
};

type BootstrapPayload = {
  defaultLocationId: string;
  locations: { id: string; name: string; is_active: boolean }[];
  workers: { id: string; location_id: string; name: string; is_active: boolean }[];
  workerServices: {
    id: string;
    worker_id: string;
    service_id: string;
    duration_min: number;
    price: number;
    color?: string | null;
    is_active: boolean;
    services: { id: string; name: string; is_active: boolean } | null;
  }[];
  shiftSettings: {
    location_id: string;
    morning_start: string;
    morning_end: string;
    afternoon_start: string;
    afternoon_end: string;
  } | null;
};

type MyAppointmentsPayload = {
  appointments: {
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
  }[];
};

type ShiftType = "morning" | "afternoon" | "off";

type WorkerCalendarSummaryPayload = {
  summaries: {
    date: string;
    shiftType: ShiftType;
    availability: "free" | "busy" | "off";
  }[];
};

const toDateInput = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const dateAfter = (days: number) => {
  const now = new Date();
  now.setDate(now.getDate() + days);
  return toDateInput(now);
};

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const addMonths = (date: Date, months: number) =>
  new Date(date.getFullYear(), date.getMonth() + months, 1);

const WORKING_DAYS = [1, 2, 3, 4, 5];
const WORKING_DAY_ORDER = [...WORKING_DAYS].sort((a, b) => a - b);
const getWorkdayColumn = (day: number) => WORKING_DAY_ORDER.indexOf(day);

const formatMonthLabel = (date: Date, locale: string) =>
  new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
  }).format(date);

type CalendarDay = {
  value: string | null;
  label: string;
  inMonth: boolean;
  inRange: boolean;
};

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
    const day = new Date(year, month, dayNumber);
    if (getWorkdayColumn(day.getDay()) === -1) {
      continue;
    }
    const inRange = day >= minDate && day <= maxDate;
    days.push({
      value: toDateInput(day),
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

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
};

const readResponseJsonSafe = async <T,>(response: Response): Promise<T | null> => {
  const text = await response.text();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
};

type SrdjanAppProps = {
  embedded?: boolean;
};

export default function SrdjanApp({ embedded = false }: SrdjanAppProps) {
  const [bootstrap, setBootstrap] = useState<BootstrapPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [client, setClient] = useState<ClientProfile | null>(null);
  const [authForm, setAuthForm] = useState({ fullName: "", phone: "", email: "" });
  const [locationId, setLocationId] = useState("");
  const [workerId, setWorkerId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [date, setDate] = useState(dateAfter(1));
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const base = new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const [time, setTime] = useState("");
  const [note, setNote] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [shiftLabel, setShiftLabel] = useState("");
  const [calendarSummaryByDate, setCalendarSummaryByDate] = useState<
    Record<string, { shiftType: ShiftType; availability: "free" | "busy" | "off" }>
  >({});
  const [status, setStatus] = useState("");
  const [appointments, setAppointments] = useState<MyAppointmentsPayload["appointments"]>([]);
  const [subscribingPush, setSubscribingPush] = useState(false);

  const appName = process.env.NEXT_PUBLIC_APP_NAME || "Frizerski salon Srdjan";
  const webPushPublicKey = process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY || "";
  const locale = "sr-RS";

  const minDate = useMemo(() => {
    const tomorrow = addDays(new Date(), 1);
    return new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());
  }, []);
  const maxDate = useMemo(() => addDays(minDate, 30), [minDate]);
  const monthDays = useMemo(
    () => buildCalendarDays(calendarMonth, minDate, maxDate),
    [calendarMonth, minDate, maxDate]
  );
  const minMonth = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
  const maxMonth = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);
  const canGoPrevMonth = calendarMonth > minMonth;
  const canGoNextMonth = calendarMonth < maxMonth;
  const workersForLocation = useMemo(
    () => (bootstrap?.workers || []).filter((item) => item.location_id === locationId),
    [bootstrap?.workers, locationId]
  );
  const canChooseWorker = Boolean(locationId);
  const canChooseDateAndService = Boolean(locationId && workerId);

  const workerServices = useMemo(
    () => (bootstrap?.workerServices || []).filter((item) => item.worker_id === workerId),
    [bootstrap?.workerServices, workerId]
  );

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [bootstrapRes, meRes] = await Promise.all([
          fetch("/api/public/bootstrap"),
          fetch("/api/public/session/me"),
        ]);

        const bootstrapData = await readResponseJsonSafe<BootstrapPayload & { error?: string }>(
          bootstrapRes
        );
        if (!bootstrapRes.ok) {
          throw new Error(
            bootstrapData?.error ||
              `Bootstrap failed (HTTP ${bootstrapRes.status}). Proverite Vercel env varijable.`
          );
        }
        if (!bootstrapData) {
          throw new Error("Bootstrap endpoint je vratio prazan ili neispravan JSON.");
        }
        setBootstrap(bootstrapData);
        setLocationId("");
        setWorkerId("");
        setServiceId("");

        if (meRes.ok) {
          const me = await readResponseJsonSafe<{ client?: ClientProfile }>(meRes);
          setClient(me?.client || null);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Neuspesno ucitavanje.";
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const loadMyAppointments = async () => {
    const response = await fetch("/api/public/my-appointments");
    const data = await readResponseJsonSafe<MyAppointmentsPayload & { error?: string }>(response);
    if (!response.ok) {
      if (response.status === 401) {
        setAppointments([]);
        return;
      }
      throw new Error(data?.error || `Ne mogu da ucitam termine (HTTP ${response.status}).`);
    }
    setAppointments(data?.appointments || []);
  };

  useEffect(() => {
    if (!client) {
      setAppointments([]);
      return;
    }
    loadMyAppointments().catch(() => undefined);
  }, [client]);

  useEffect(() => {
    const next = workerServices[0]?.service_id || "";
    if (serviceId && workerServices.some((item) => item.service_id === serviceId)) {
      return;
    }
    setServiceId(next);
    setTime("");
  }, [workerServices, serviceId]);

  useEffect(() => {
    const selected = new Date(`${date}T00:00:00`);
    if (!Number.isNaN(selected.getTime())) {
      setCalendarMonth(new Date(selected.getFullYear(), selected.getMonth(), 1));
    }
  }, [date]);

  useEffect(() => {
    if (!locationId || !workerId || !serviceId) {
      setCalendarSummaryByDate({});
      return;
    }

    const monthStart = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
    const monthEnd = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0);
    const fromDate = monthStart < minDate ? minDate : monthStart;
    const toDate = monthEnd > maxDate ? maxDate : monthEnd;
    if (fromDate > toDate) {
      setCalendarSummaryByDate({});
      return;
    }

    const controller = new AbortController();
    const loadSummary = async () => {
      try {
        const response = await fetch(
          `/api/public/worker-calendar-summary?locationId=${encodeURIComponent(
            locationId
          )}&workerId=${encodeURIComponent(workerId)}&serviceId=${encodeURIComponent(
            serviceId
          )}&from=${encodeURIComponent(toDateInput(fromDate))}&to=${encodeURIComponent(
            toDateInput(toDate)
          )}`,
          { signal: controller.signal }
        );
        const data = await readResponseJsonSafe<WorkerCalendarSummaryPayload & { error?: string }>(
          response
        );
        if (!response.ok || !data) {
          return;
        }
        const next: Record<string, { shiftType: ShiftType; availability: "free" | "busy" | "off" }> =
          {};
        for (const item of data.summaries || []) {
          if (item?.date && item?.shiftType) {
            next[item.date] = {
              shiftType: item.shiftType,
              availability: item.availability || "off",
            };
          }
        }
        setCalendarSummaryByDate(next);
      } catch {
        if (!controller.signal.aborted) {
          setCalendarSummaryByDate({});
        }
      }
    };

    loadSummary();
    return () => controller.abort();
  }, [calendarMonth, locationId, workerId, serviceId, minDate, maxDate]);

  useEffect(() => {
    if (!locationId || !workerId || !serviceId || !date) {
      setSlots([]);
      setShiftLabel("");
      return;
    }
    const controller = new AbortController();
    const loadAvailability = async () => {
      setStatus("");
      try {
        const response = await fetch(
          `/api/public/availability?locationId=${encodeURIComponent(locationId)}&workerId=${encodeURIComponent(
            workerId
          )}&serviceId=${encodeURIComponent(serviceId)}&date=${encodeURIComponent(date)}`,
          { signal: controller.signal }
        );
        const data = await readResponseJsonSafe<{ error?: string; slots?: string[]; shiftType?: string }>(
          response
        );
        if (!response.ok) {
          throw new Error(
            data?.error || `Ne mogu da ucitam slobodne termine (HTTP ${response.status}).`
          );
        }
        setSlots(Array.isArray(data?.slots) ? data.slots : []);
        if (data?.shiftType === "morning") {
          setShiftLabel("Prepodnevna smena");
        } else if (data?.shiftType === "afternoon") {
          setShiftLabel("Popodnevna smena");
        } else {
          setShiftLabel("Radnik ne radi taj dan");
        }
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        setSlots([]);
        setShiftLabel("");
        setStatus(error instanceof Error ? error.message : "Greska.");
      }
    };
    loadAvailability();
    return () => controller.abort();
  }, [locationId, workerId, serviceId, date]);

  const selectedWorker = (bootstrap?.workers || []).find((item) => item.id === workerId);
  const selectedService = workerServices.find((item) => item.service_id === serviceId);

  const handleSessionStart = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus("");
    if (!authForm.phone.trim() && !authForm.email.trim()) {
      setStatus("Unesite telefon ili email.");
      return;
    }
    const response = await fetch("/api/public/session/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(authForm),
    });
    const data = await readResponseJsonSafe<{ error?: string; client?: ClientProfile }>(response);
    if (!response.ok) {
      setStatus(data?.error || `Prijava nije uspela (HTTP ${response.status}).`);
      return;
    }
    setClient(data?.client || null);
    if (data?.client) {
      setAuthForm({
        fullName: data.client.fullName || "",
        phone: data.client.phone || authForm.phone,
        email: data.client.email || authForm.email,
      });
    }
    setStatus("Prijava je uspesna.");
  };

  const handleLogout = async () => {
    await fetch("/api/public/session/logout", { method: "POST" });
    setClient(null);
    setAppointments([]);
    setStatus("");
  };

  const handleBook = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!client) {
      setStatus("Prvo se prijavite.");
      return;
    }
    const response = await fetch("/api/public/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        locationId,
        workerId,
        serviceId,
        date,
        time,
        note,
      }),
    });
    const data = await readResponseJsonSafe<{ error?: string }>(response);
    if (!response.ok) {
      setStatus(data?.error || `Zakazivanje nije uspelo (HTTP ${response.status}).`);
      return;
    }
    setStatus("Termin je poslat i ceka potvrdu radnika.");
    setTime("");
    setNote("");
    await loadMyAppointments();
  };

  const handleEnablePush = async () => {
    if (!webPushPublicKey) {
      setStatus("WEB push nije konfigurisan.");
      return;
    }
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("Push notifikacije nisu podrzane.");
      return;
    }

    setSubscribingPush(true);
    setStatus("");
    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("Dozvola za notifikacije nije odobrena.");
        return;
      }
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(webPushPublicKey),
      });
      const response = await fetch("/api/public/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription),
      });
      const data = await readResponseJsonSafe<{ error?: string }>(response);
      if (!response.ok) {
        setStatus(data?.error || `Ne mogu da sacuvam push pretplatu (HTTP ${response.status}).`);
        return;
      }
      setStatus("Push notifikacije su aktivirane.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Push setup nije uspeo.");
    } finally {
      setSubscribingPush(false);
    }
  };

  if (loading) {
    return embedded ? <p>Ucitavanje...</p> : <main className="container"><p>Ucitavanje...</p></main>;
  }

  const content = (
    <>
      <header style={{ marginBottom: 20 }}>
        <h1>{appName}</h1>
        <p>Zaseban kalendar po frizeru, smene i dostupni termini po usluzi.</p>
      </header>

      {error && <p className="form-status error">{error}</p>}

      <section className="admin-card srdjan-booking" style={{ marginBottom: 16 }}>
        <h3>Prijava klijenta</h3>
        {!client ? (
          <form className="form-grid" onSubmit={handleSessionStart}>
            <div className="form-row">
              <label htmlFor="fullName">Ime i prezime</label>
              <input
                id="fullName"
                className="input"
                value={authForm.fullName}
                onChange={(event) =>
                  setAuthForm((prev) => ({ ...prev, fullName: event.target.value }))
                }
              />
              <small>Prva prijava: unesite sva 3 polja.</small>
            </div>
            <div className="form-row">
              <label htmlFor="phone">Telefon</label>
              <input
                id="phone"
                className="input"
                value={authForm.phone}
                onChange={(event) =>
                  setAuthForm((prev) => ({ ...prev, phone: event.target.value }))
                }
              />
            </div>
            <div className="form-row">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                className="input"
                value={authForm.email}
                onChange={(event) =>
                  setAuthForm((prev) => ({ ...prev, email: event.target.value }))
                }
              />
              <small>Sledeca prijava: dovoljan je telefon ili email.</small>
            </div>
            <div className="form-row">
              <button className="button" type="submit">Prijava</button>
            </div>
          </form>
        ) : (
          <div>
            <p>Ulogovani ste kao <strong>{client.fullName}</strong> ({client.phone})</p>
            <div className="admin-actions">
              <button className="button outline" onClick={handleEnablePush} disabled={subscribingPush}>
                {subscribingPush ? "Aktiviranje..." : "Aktiviraj push notifikacije"}
              </button>
              <button className="button outline" onClick={handleLogout}>Odjava</button>
              <Link className="button outline" href="/moji-termini">Moji termini</Link>
            </div>
          </div>
        )}
      </section>

      <section className="admin-card srdjan-booking" style={{ marginBottom: 16 }}>
        <h3>Zakazivanje termina</h3>
        <form className="form-grid" onSubmit={handleBook}>
          <div className="form-row">
            <label htmlFor="location">Radnja</label>
            <select
              id="location"
              className="select"
              value={locationId}
              onChange={(event) => {
                const nextLocation = event.target.value;
                setLocationId(nextLocation);
                setWorkerId("");
                setServiceId("");
                setTime("");
              }}
            >
              <option value="">Izaberite radnju</option>
              {(bootstrap?.locations || []).map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <label htmlFor="worker">Radnik</label>
            <select
              id="worker"
              className="select"
              value={workerId}
              disabled={!canChooseWorker}
              onChange={(event) => {
                setWorkerId(event.target.value);
                setServiceId("");
                setTime("");
              }}
            >
              <option value="">{canChooseWorker ? "Izaberite radnika" : "Prvo izaberite radnju"}</option>
              {workersForLocation.map((worker) => (
                <option key={worker.id} value={worker.id}>
                  {worker.name}
                </option>
              ))}
            </select>
          </div>

          {!canChooseDateAndService && (
            <div className="form-row form-row--full">
              <p className="form-status">Izaberite radnju i radnika da se prikazu kalendar, usluge i termini.</p>
            </div>
          )}

          {canChooseDateAndService && (
            <>
              <div className="form-row">
                <label htmlFor="date">Datum</label>
                <div className="calendar">
                  <div className="calendar-header">
                    <button
                      type="button"
                      className="button outline small"
                      onClick={() => setCalendarMonth(addMonths(calendarMonth, -1))}
                      disabled={!canGoPrevMonth}
                    >
                      Prethodni
                    </button>
                    <div className="calendar-title">{formatMonthLabel(calendarMonth, locale)}</div>
                    <button
                      type="button"
                      className="button outline small"
                      onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}
                      disabled={!canGoNextMonth}
                    >
                      Sledeci
                    </button>
                  </div>
                  <div className="calendar-weekdays">
                    {["pon", "uto", "sre", "cet", "pet"].map((day) => (
                      <span key={day}>{day}</span>
                    ))}
                  </div>
                  <div className="calendar-grid">
                    {monthDays.map((day, index) => {
                      if (!day.inMonth || !day.value) {
                        return <div key={`empty-${index}`} className="calendar-cell" />;
                      }
                      const isActive = day.value === date;
                      const summary = calendarSummaryByDate[day.value];
                      const availabilityClass =
                        summary?.availability === "free"
                          ? "is-high"
                          : summary?.availability === "busy"
                          ? "is-none"
                          : "is-loading";
                      const shiftClass =
                        summary?.shiftType === "morning"
                          ? "is-morning"
                          : summary?.shiftType === "afternoon"
                          ? "is-afternoon"
                          : summary?.shiftType === "off"
                          ? "is-none"
                          : "is-loading";
                      return (
                        <button
                          key={day.value}
                          type="button"
                          className={`calendar-day ${isActive ? "is-active" : ""}`}
                          disabled={!day.inRange}
                          onClick={() => {
                            setDate(day.value || date);
                            setTime("");
                          }}
                        >
                          <span>{day.label}</span>
                          <span className={`calendar-indicator ${availabilityClass}`} />
                          <span className={`calendar-indicator calendar-indicator--shift ${shiftClass}`} />
                        </button>
                      );
                    })}
                  </div>
                </div>
                {shiftLabel && <small>{shiftLabel}</small>}
                <small>
                  Linija 1: <strong>zelena</strong> slobodno, <strong>crvena</strong> zauzeto. Linija 2:
                  smena (<strong>plava</strong> prepodne, <strong>narandzasta</strong> popodne).
                </small>
              </div>

              <div className="form-row">
                <label htmlFor="service">Usluga</label>
                <select
                  id="service"
                  className="select"
                  value={serviceId}
                  onChange={(event) => {
                    setServiceId(event.target.value);
                    setTime("");
                  }}
                  required
                >
                  <option value="">Izaberite uslugu</option>
                  {workerServices.map((item) => (
                    <option key={item.id} value={item.service_id}>
                      {item.services?.name || "Usluga"} ({item.duration_min} min / {item.price} RSD)
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-row form-row--full">
                <label>Termin</label>
                <div className="slot-items slot-items--single">
                  {slots.map((slot) => (
                    <button
                      type="button"
                      key={slot}
                      className={`slot-button ${time === slot ? "is-active is-selected" : ""}`}
                      onClick={() => setTime(slot)}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-row form-row--full">
                <label htmlFor="note">Napomena</label>
                <textarea
                  id="note"
                  className="textarea"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                />
              </div>

              <div className="form-row">
                <button
                  className="button booking-submit-button"
                  type="submit"
                  disabled={!client || !time || !selectedService}
                >
                  Posalji zahtev za termin
                </button>
              </div>
            </>
          )}
        </form>
        <p>
          Izabrano: <strong>{selectedWorker?.name || "-"}</strong> /{" "}
          <strong>{selectedService?.services?.name || "-"}</strong> /{" "}
          <strong>{time || "-"}</strong>
        </p>
      </section>

      <section className="admin-card">
        <h3>Moji termini (brzi pregled)</h3>
        {!client && <p>Prijavite se da vidite termine.</p>}
        {client && appointments.length === 0 && <p>Jos nema termina.</p>}
        {appointments.map((appointment) => (
          <div key={appointment.id} className="admin-card">
            <strong>{appointment.service_name_snapshot}</strong>
            <div>
              {appointment.date} {appointment.start_time}-{appointment.end_time}
            </div>
            <div>Radnik: {appointment.workers?.name || "-"}</div>
            <div>Status: {appointment.status}</div>
            {appointment.cancellation_reason && (
              <div>Razlog otkazivanja: {appointment.cancellation_reason}</div>
            )}
          </div>
        ))}
      </section>

      {status && <p className="form-status success">{status}</p>}
    </>
  );

  if (embedded) {
    return <div>{content}</div>;
  }

  return (
    <main className="container" style={{ paddingTop: 24, paddingBottom: 48 }}>
      {content}
    </main>
  );
}
