"use client";

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";

import { services } from "@/lib/services";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";

type StatusState = {
  type: "idle" | "sending" | "success" | "error";
  message?: string;
};

type BookingFormData = {
  name: string;
  phone: string;
  email: string;
  serviceId: string;
  date: string;
  time: string;
  note: string;
};

export default function BookingForm() {
  const initialServiceId = services[0]?.id ?? "";
  const [clientToken, setClientToken] = useState<string | null>(null);
  const [formData, setFormData] = useState<BookingFormData>({
    name: "",
    phone: "",
    email: "",
    serviceId: initialServiceId,
    date: "",
    time: "",
    note: "",
  });
  const [status, setStatus] = useState<StatusState>({ type: "idle" });

  useEffect(() => {
    const storedToken = localStorage.getItem("db_client_token");
    const storedName = localStorage.getItem("db_client_name");
    const storedPhone = localStorage.getItem("db_client_phone");
    const storedEmail = localStorage.getItem("db_client_email");

    if (storedToken) {
      setClientToken(storedToken);
    }

    setFormData((prev) => ({
      ...prev,
      name: storedName || prev.name,
      phone: storedPhone || prev.phone,
      email: storedEmail || prev.email,
    }));
  }, []);

  const selectedService = useMemo(
    () => services.find((service) => service.id === formData.serviceId),
    [formData.serviceId]
  );

  const handleChange = (
    event: ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!apiBaseUrl) {
      setStatus({
        type: "error",
        message: "API nije podesen. Dodaj NEXT_PUBLIC_API_BASE_URL u .env.",
      });
      return;
    }

    setStatus({ type: "sending" });

    const payload = {
      clientName: formData.name.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim(),
      serviceId: formData.serviceId,
      serviceName: selectedService?.name ?? "",
      duration: selectedService?.duration ?? "",
      price: selectedService?.price ?? 0,
      date: formData.date,
      time: formData.time,
      notes: formData.note.trim(),
      clientToken,
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
        date: "",
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

  return (
    <form className="booking-form" onSubmit={handleSubmit}>
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
          Potvrdu termina saljemo u roku od 24h.
        </p>
      </div>

      <div className="form-grid">
        <div className="form-row">
          <label htmlFor="name">Ime i prezime</label>
          <input
            id="name"
            name="name"
            className="input"
            value={formData.name}
            onChange={handleChange}
            placeholder="Unesi puno ime"
            autoComplete="name"
            required
          />
        </div>
        <div className="form-row">
          <label htmlFor="phone">Telefon</label>
          <input
            id="phone"
            name="phone"
            className="input"
            value={formData.phone}
            onChange={handleChange}
            placeholder="061 234 567"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            required
          />
        </div>
        <div className="form-row form-row--full">
          <label htmlFor="email">Email (opciono)</label>
          <input
            id="email"
            name="email"
            className="input"
            value={formData.email}
            onChange={handleChange}
            placeholder="ime@email.com"
            type="email"
            autoComplete="email"
          />
        </div>
        <div className="form-row form-row--full">
          <label htmlFor="serviceId">Usluga</label>
          <select
            id="serviceId"
            name="serviceId"
            className="select"
            value={formData.serviceId}
            onChange={handleChange}
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
        <div className="form-row">
          <label htmlFor="date">Datum</label>
          <input
            id="date"
            name="date"
            className="input"
            type="date"
            value={formData.date}
            onChange={handleChange}
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
            value={formData.time}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-row form-row--full">
          <label htmlFor="note">Napomena</label>
          <textarea
            id="note"
            name="note"
            className="textarea"
            value={formData.note}
            onChange={handleChange}
            placeholder="Specijalne zelje, stil, dodatne informacije."
          />
        </div>
      </div>

      {clientToken && (
        <div className="form-status success">
          Ulogovani ste kao klijent. Termin ce biti vezan za vas nalog.
        </div>
      )}
      {status.type !== "idle" && status.message && (
        <div className={`form-status ${status.type}`}>{status.message}</div>
      )}
      <button className="button" type="submit" disabled={status.type === "sending"}>
        {status.type === "sending" ? "Slanje..." : "Posalji zahtev"}
      </button>
    </form>
  );
}
