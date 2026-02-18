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

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
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
  const [time, setTime] = useState("");
  const [note, setNote] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [shiftLabel, setShiftLabel] = useState("");
  const [status, setStatus] = useState("");
  const [appointments, setAppointments] = useState<MyAppointmentsPayload["appointments"]>([]);
  const [subscribingPush, setSubscribingPush] = useState(false);

  const appName = process.env.NEXT_PUBLIC_APP_NAME || "Frizerski salon Srdjan";
  const webPushPublicKey = process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY || "";

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

        const bootstrapData = (await bootstrapRes.json()) as BootstrapPayload;
        if (!bootstrapRes.ok) {
          throw new Error((bootstrapData as unknown as { error?: string }).error || "Bootstrap failed.");
        }
        setBootstrap(bootstrapData);
        const loc = bootstrapData.defaultLocationId || bootstrapData.locations?.[0]?.id || "";
        setLocationId(loc);
        const firstWorker = bootstrapData.workers?.[0]?.id || "";
        setWorkerId(firstWorker);

        const firstService = bootstrapData.workerServices.find(
          (item) => item.worker_id === firstWorker
        );
        setServiceId(firstService?.service_id || "");

        if (meRes.ok) {
          const me = await meRes.json();
          setClient(me.client);
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
    const data = (await response.json()) as MyAppointmentsPayload;
    if (!response.ok) {
      if (response.status === 401) {
        setAppointments([]);
        return;
      }
      throw new Error((data as unknown as { error?: string }).error || "Ne mogu da ucitam termine.");
    }
    setAppointments(data.appointments || []);
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
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Ne mogu da ucitam slobodne termine.");
        }
        setSlots(Array.isArray(data.slots) ? data.slots : []);
        if (data.shiftType === "morning") {
          setShiftLabel("Prepodnevna smena");
        } else if (data.shiftType === "afternoon") {
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
    const response = await fetch("/api/public/session/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(authForm),
    });
    const data = await response.json();
    if (!response.ok) {
      setStatus(data.error || "Prijava nije uspela.");
      return;
    }
    setClient(data.client);
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
    const data = await response.json();
    if (!response.ok) {
      setStatus(data.error || "Zakazivanje nije uspelo.");
      return;
    }
    setStatus("Termin je uspesno zakazan.");
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
      const data = await response.json();
      if (!response.ok) {
        setStatus(data.error || "Ne mogu da sacuvam push pretplatu.");
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

      <section className="admin-card" style={{ marginBottom: 16 }}>
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
                required
              />
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
                required
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
                required
              />
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

      <section className="admin-card" style={{ marginBottom: 16 }}>
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
                const nextWorkers = (bootstrap?.workers || []).filter(
                  (item) => item.location_id === nextLocation
                );
                setWorkerId(nextWorkers[0]?.id || "");
                setServiceId("");
                setTime("");
              }}
            >
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
              onChange={(event) => {
                setWorkerId(event.target.value);
                setTime("");
              }}
            >
              {(bootstrap?.workers || [])
                .filter((worker) => worker.location_id === locationId)
                .map((worker) => (
                  <option key={worker.id} value={worker.id}>
                    {worker.name}
                  </option>
                ))}
            </select>
          </div>

          <div className="form-row">
            <label htmlFor="date">Datum</label>
            <input
              id="date"
              type="date"
              className="input"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              required
            />
            {shiftLabel && <small>{shiftLabel}</small>}
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
              {workerServices.map((item) => (
                <option key={item.id} value={item.service_id}>
                  {item.services?.name || "Usluga"} ({item.duration_min} min / {item.price} RSD)
                </option>
              ))}
            </select>
          </div>

          <div className="form-row form-row--full">
            <label>Termin (5 min mreza)</label>
            <div className="slot-items slot-items--single">
              {slots.map((slot) => (
                <button
                  type="button"
                  key={slot}
                  className={`button outline small ${time === slot ? "is-active" : ""}`}
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
            <button className="button" type="submit" disabled={!client || !time || !selectedService}>
              Potvrdi termin
            </button>
          </div>
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
