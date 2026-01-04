"use client";

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";

import AdminShell from "@/components/admin/AdminShell";
import { services } from "@/lib/services";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";
const adminKey = process.env.NEXT_PUBLIC_ADMIN_KEY || "";

type Appointment = {
  id: string;
  clientName: string;
  phone: string;
  email?: string;
  serviceId?: string;
  serviceName: string;
  duration?: string;
  price?: number;
  date: string;
  time: string;
  notes?: string;
  status?: string;
  source?: string;
  createdAt?: string;
};

type Client = {
  id: string;
  name: string;
  phone: string;
  email?: string;
};

type AppointmentFormState = {
  clientName: string;
  phone: string;
  email: string;
  serviceId: string;
  serviceName: string;
  duration: string;
  price: string;
  date: string;
  time: string;
  notes: string;
  status: string;
  source: string;
};

type StatusState = {
  type: "idle" | "loading" | "success" | "error";
  message?: string;
};

type FilterState = {
  query: string;
  date: string;
  status: string;
  source: string;
};

const statusOptions = [
  { value: "pending", label: "Na cekanju" },
  { value: "confirmed", label: "Potvrdjen" },
  { value: "completed", label: "Zavrsen" },
  { value: "cancelled", label: "Otkazan" },
  { value: "no_show", label: "Nije dosao" },
];

const statusLabels: Record<string, string> = {
  pending: "Na cekanju",
  confirmed: "Potvrdjen",
  completed: "Zavrsen",
  cancelled: "Otkazan",
  no_show: "Nije dosao",
};

const sourceLabels: Record<string, string> = {
  web: "Online",
  admin: "Rucno",
};

const normalizePhoneValue = (value: string) => value.replace(/\D+/g, "");

const formatDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const normalizeTimeInput = (value: string) => (value ? value.slice(0, 5) : "");

const buildDefaultFormState = (overrides: Partial<AppointmentFormState> = {}) => {
  const defaultService = services[0];
  return {
    clientName: "",
    phone: "",
    email: "",
    serviceId: defaultService?.id ?? "",
    serviceName: defaultService?.name ?? "",
    duration: defaultService?.duration ?? "",
    price: defaultService ? String(defaultService.price) : "",
    date: formatDateInput(new Date()),
    time: "",
    notes: "",
    status: "pending",
    source: "admin",
    ...overrides,
  };
};

export default function AdminAppointmentsManager() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [status, setStatus] = useState<StatusState>({ type: "idle" });
  const [formStatus, setFormStatus] = useState<StatusState>({ type: "idle" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    query: "",
    date: "",
    status: "all",
    source: "all",
  });
  const [formState, setFormState] = useState<AppointmentFormState>(() =>
    buildDefaultFormState()
  );
  const [clients, setClients] = useState<Client[]>([]);
  const [clientsStatus, setClientsStatus] = useState<StatusState>({ type: "idle" });
  const [selectedClientId, setSelectedClientId] = useState("");

  const hasUnknownService =
    formState.serviceId !== "" &&
    !services.some((service) => service.id === formState.serviceId);

  const hasFilters =
    filters.query.trim() !== "" ||
    filters.date !== "" ||
    filters.status !== "all" ||
    filters.source !== "all";

  const filteredAppointments = useMemo(() => {
    const query = filters.query.trim().toLowerCase();

    return appointments.filter((appointment) => {
      if (filters.date && appointment.date !== filters.date) {
        return false;
      }

      if (filters.status !== "all" && appointment.status !== filters.status) {
        return false;
      }

      if (filters.source !== "all" && appointment.source !== filters.source) {
        return false;
      }

      if (!query) {
        return true;
      }

      const haystack = [
        appointment.clientName,
        appointment.phone,
        appointment.email,
        appointment.serviceName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [appointments, filters]);

  const subtitle = hasFilters
    ? `Ukupno termina: ${appointments.length} | Prikazano: ${filteredAppointments.length}`
    : `Ukupno termina: ${appointments.length}`;

  const fetchAppointments = async () => {
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
      const response = await fetch(`${apiBaseUrl}/appointments.php`, {
        headers: {
          "X-Admin-Key": adminKey,
        },
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Ne mogu da preuzmem termine.");
      }

      const items = Array.isArray(data.appointments) ? data.appointments : [];
      items.sort((a: Appointment, b: Appointment) =>
        `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`)
      );
      setAppointments(items);
      setStatus({ type: "success", message: "Termini su osvezeni." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Doslo je do greske.";
      setStatus({ type: "error", message });
    }
  };

  const fetchClients = async () => {
    if (!apiBaseUrl) {
      setClientsStatus({
        type: "error",
        message: "API nije podesen. Dodaj NEXT_PUBLIC_API_BASE_URL u .env.",
      });
      return;
    }

    if (!adminKey) {
      setClientsStatus({
        type: "error",
        message: "Dodaj NEXT_PUBLIC_ADMIN_KEY u .env da bi CMS radio.",
      });
      return;
    }

    setClientsStatus({ type: "loading" });

    try {
      const response = await fetch(`${apiBaseUrl}/clients.php`, {
        headers: {
          "X-Admin-Key": adminKey,
        },
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Ne mogu da preuzmem klijente.");
      }

      const items = Array.isArray(data.clients) ? data.clients : [];
      setClients(items);
      setClientsStatus({ type: "success" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Doslo je do greske.";
      setClientsStatus({ type: "error", message });
    }
  };

  useEffect(() => {
    fetchAppointments();
    fetchClients();
  }, []);

  const resetForm = (overrides: Partial<AppointmentFormState> = {}) => {
    setEditingId(null);
    setFormState(buildDefaultFormState(overrides));
    setFormStatus({ type: "idle" });
    setSelectedClientId("");
  };

  const handleFilterChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleInputChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    if (name === "clientName" || name === "phone" || name === "email") {
      setSelectedClientId("");
    }
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleServiceChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextServiceId = event.target.value;
    const selected = services.find((service) => service.id === nextServiceId);

    if (selected) {
      setFormState((prev) => ({
        ...prev,
        serviceId: selected.id,
        serviceName: selected.name,
        duration: selected.duration,
        price: String(selected.price),
      }));
      return;
    }

    setFormState((prev) => ({
      ...prev,
      serviceId: nextServiceId,
    }));
  };

  const resolveClientId = (appointment: Appointment) => {
    if (clients.length === 0) {
      return "";
    }

    const email = (appointment.email || "").trim().toLowerCase();
    const phone = normalizePhoneValue(appointment.phone || "");
    const name = (appointment.clientName || "").trim().toLowerCase();

    const match = clients.find((client) => {
      if (email && client.email && client.email.toLowerCase() === email) {
        return true;
      }
      const clientPhone = normalizePhoneValue(client.phone || "");
      if (phone && clientPhone && clientPhone === phone) {
        return true;
      }
      if (name && client.name && client.name.trim().toLowerCase() === name) {
        return true;
      }
      return false;
    });

    return match?.id ?? "";
  };

  const handleClientSelect = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextId = event.target.value;
    setSelectedClientId(nextId);

    if (!nextId) {
      return;
    }

    const selected = clients.find((client) => client.id === nextId);
    if (selected) {
      setFormState((prev) => ({
        ...prev,
        clientName: selected.name || "",
        phone: selected.phone || "",
        email: selected.email || "",
      }));
    }
  };

  const validateForm = () => {
    if (!apiBaseUrl) {
      return "API nije podesen. Dodaj NEXT_PUBLIC_API_BASE_URL u .env.";
    }

    if (!adminKey) {
      return "Dodaj NEXT_PUBLIC_ADMIN_KEY u .env da bi CMS radio.";
    }

    if (!formState.clientName.trim() || !formState.phone.trim()) {
      return "Unesi ime klijenta i telefon.";
    }

    if (!formState.serviceId || !formState.serviceName.trim()) {
      return "Izaberi uslugu.";
    }

    if (!formState.duration.trim()) {
      return "Unesi trajanje usluge.";
    }

    if (!formState.date || !formState.time) {
      return "Izaberi datum i vreme.";
    }

    if (!formState.status) {
      return "Izaberi status.";
    }

    return null;
  };

  const buildPayload = () => {
    const priceValue = Number(formState.price);
    return {
      clientName: formState.clientName.trim(),
      phone: formState.phone.trim(),
      email: formState.email.trim(),
      serviceId: formState.serviceId.trim(),
      serviceName: formState.serviceName.trim(),
      duration: formState.duration.trim(),
      price: Number.isFinite(priceValue) ? priceValue : 0,
      date: formState.date,
      time: normalizeTimeInput(formState.time),
      notes: formState.notes.trim(),
      status: formState.status,
      source: formState.source || "admin",
    };
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const errorMessage = validateForm();
    if (errorMessage) {
      setFormStatus({ type: "error", message: errorMessage });
      return;
    }

    setFormStatus({ type: "loading" });

    try {
      const payload = buildPayload();
      const response = await fetch(`${apiBaseUrl}/appointments.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Key": adminKey,
        },
        body: JSON.stringify({
          adminAction: editingId ? "update" : "create",
          id: editingId ?? undefined,
          ...payload,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Ne mogu da sacuvam termin.");
      }

      setFormStatus({
        type: "success",
        message: editingId ? "Termin je izmenjen." : "Termin je sacuvan.",
      });

      if (editingId) {
        resetForm();
      } else {
        setFormState((prev) => ({
          ...prev,
          clientName: "",
          phone: "",
          email: "",
          notes: "",
        }));
      }

      await fetchAppointments();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Doslo je do greske.";
      setFormStatus({ type: "error", message });
    }
  };

  const handleEdit = (appointment: Appointment) => {
    const resolvedClientId = resolveClientId(appointment);
    setEditingId(appointment.id);
    setFormState(
      buildDefaultFormState({
        clientName: appointment.clientName ?? "",
        phone: appointment.phone ?? "",
        email: appointment.email ?? "",
        serviceId: appointment.serviceId ?? "",
        serviceName: appointment.serviceName ?? "",
        duration: appointment.duration ?? "",
        price:
          appointment.price !== undefined && appointment.price !== null
            ? String(appointment.price)
            : "",
        date: appointment.date ?? formatDateInput(new Date()),
        time: normalizeTimeInput(appointment.time ?? ""),
        notes: appointment.notes ?? "",
        status: appointment.status ?? "pending",
        source: appointment.source ?? "web",
      })
    );
    setSelectedClientId(resolvedClientId);
    setFormStatus({ type: "idle" });
  };

  const handleDelete = async (id: string) => {
    if (!apiBaseUrl || !adminKey) {
      return;
    }

    const confirmed = window.confirm("Da li sigurno zelis da obrises termin?");
    if (!confirmed) {
      return;
    }

    setStatus({ type: "loading" });

    try {
      const response = await fetch(`${apiBaseUrl}/appointments.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Key": adminKey,
        },
        body: JSON.stringify({
          adminAction: "delete",
          id,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Ne mogu da obrisem termin.");
      }

      if (editingId === id) {
        resetForm();
      }

      await fetchAppointments();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Doslo je do greske.";
      setStatus({ type: "error", message });
    }
  };

  const updateStatus = async (id: string, nextStatus: string) => {
    if (!apiBaseUrl || !adminKey) {
      return;
    }

    setStatus({ type: "loading" });

    try {
      const response = await fetch(`${apiBaseUrl}/appointments.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Key": adminKey,
        },
        body: JSON.stringify({
          adminAction: "update_status",
          id,
          status: nextStatus,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Ne mogu da sacuvam status.");
      }

      setAppointments((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status: nextStatus } : item))
      );
      setStatus({ type: "success", message: "Status je sacuvan." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Doslo je do greske.";
      setStatus({ type: "error", message });
    }
  };

  return (
    <AdminShell title="Termini" subtitle={subtitle}>
      <div className="admin-grid">
        <div className="admin-toolbar">
          <button className="button" type="button" onClick={fetchAppointments}>
            Osvezi listu
          </button>
          {hasFilters && (
            <button
              className="button outline"
              type="button"
              onClick={() =>
                setFilters({ query: "", date: "", status: "all", source: "all" })
              }
            >
              Ocisti filtere
            </button>
          )}
          {status.type !== "idle" && status.message && (
            <div className={`form-status ${status.type}`}>{status.message}</div>
          )}
        </div>

        <div className="admin-card">
          <h3>Lista termina</h3>
          {filteredAppointments.length === 0 && status.type !== "loading" && (
            <div className="admin-card">Nema termina za prikaz.</div>
          )}
          {filteredAppointments.map((appointment) => (
            <div key={appointment.id} className="admin-card">
              <div className={`status-pill ${appointment.status || "pending"}`}>
                {statusLabels[appointment.status || "pending"] || appointment.status}
              </div>
              <strong>{appointment.serviceName}</strong>
              <span>
                {appointment.date} | {normalizeTimeInput(appointment.time)}
              </span>
              <div>{appointment.clientName}</div>
              <span>{appointment.phone}</span>
              {appointment.email && <span>{appointment.email}</span>}
              {appointment.notes && <span>Napomena: {appointment.notes}</span>}
              <span>Izvor: {sourceLabels[appointment.source || ""] || "Nepoznato"}</span>
              {appointment.createdAt && <span>Kreirano: {appointment.createdAt}</span>}
              <div className="admin-actions">
                <button
                  className="button outline"
                  type="button"
                  onClick={() => handleEdit(appointment)}
                >
                  Izmeni
                </button>
                <button
                  className="button outline"
                  type="button"
                  onClick={() => handleDelete(appointment.id)}
                >
                  Obrisi
                </button>
                {statusOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updateStatus(appointment.id, option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="admin-card">
          <h3>Pretraga termina</h3>
          <div className="form-grid">
            <div className="form-row">
              <label htmlFor="filter-query">Pretraga</label>
              <input
                id="filter-query"
                name="query"
                className="input"
                value={filters.query}
                onChange={handleFilterChange}
                placeholder="Ime, telefon, usluga"
              />
            </div>
            <div className="form-row">
              <label htmlFor="filter-date">Datum</label>
              <input
                id="filter-date"
                name="date"
                className="input"
                type="date"
                value={filters.date}
                onChange={handleFilterChange}
              />
            </div>
            <div className="form-row">
              <label htmlFor="filter-status">Status</label>
              <select
                id="filter-status"
                name="status"
                className="select"
                value={filters.status}
                onChange={handleFilterChange}
              >
                <option value="all">Svi</option>
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <label htmlFor="filter-source">Izvor</label>
              <select
                id="filter-source"
                name="source"
                className="select"
                value={filters.source}
                onChange={handleFilterChange}
              >
                <option value="all">Svi</option>
                <option value="web">Online</option>
                <option value="admin">Rucno</option>
              </select>
            </div>
          </div>
        </div>

        <div className="admin-card">
          <h3>{editingId ? "Izmeni termin" : "Novi termin"}</h3>
          <form className="form-row" onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-row">
                <label htmlFor="serviceId">Usluga</label>
                <select
                  id="serviceId"
                  name="serviceId"
                  className="select"
                  value={formState.serviceId}
                  onChange={handleServiceChange}
                  required
                >
                  <option value="" disabled>
                    Izaberi uslugu
                  </option>
                  {hasUnknownService && (
                    <option value={formState.serviceId}>
                      {formState.serviceName || "Nepoznata usluga"}
                    </option>
                  )}
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name} ({service.duration})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <label htmlFor="serviceName">Naziv usluge</label>
                <input
                  id="serviceName"
                  name="serviceName"
                  className="input"
                  value={formState.serviceName}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-row">
                <label htmlFor="duration">Trajanje</label>
                <input
                  id="duration"
                  name="duration"
                  className="input"
                  value={formState.duration}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-row">
                <label htmlFor="price">Cena</label>
                <input
                  id="price"
                  name="price"
                  className="input"
                  type="number"
                  min="0"
                  value={formState.price}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-row">
                <label htmlFor="date">Datum</label>
                <input
                  id="date"
                  name="date"
                  className="input"
                  type="date"
                  value={formState.date}
                  onChange={handleInputChange}
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
                  value={formState.time}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-row">
                <label htmlFor="client-select">Izaberi klijenta</label>
                <select
                  id="client-select"
                  className="select"
                  value={selectedClientId}
                  onChange={handleClientSelect}
                  disabled={clientsStatus.type === "loading"}
                >
                  <option value="">Novi klijent</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name} {client.phone ? `(${client.phone})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <label htmlFor="clientName">Ime klijenta</label>
                <input
                  id="clientName"
                  name="clientName"
                  className="input"
                  value={formState.clientName}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-row">
                <label htmlFor="phone">Telefon</label>
                <input
                  id="phone"
                  name="phone"
                  className="input"
                  type="tel"
                  value={formState.phone}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-row">
                <label htmlFor="email">Email (opciono)</label>
                <input
                  id="email"
                  name="email"
                  className="input"
                  type="email"
                  value={formState.email}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-row">
                <label htmlFor="status">Status</label>
                <select
                  id="status"
                  name="status"
                  className="select"
                  value={formState.status}
                  onChange={handleInputChange}
                  required
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <label htmlFor="source">Izvor</label>
                <select
                  id="source"
                  name="source"
                  className="select"
                  value={formState.source}
                  onChange={handleInputChange}
                >
                  <option value="admin">Rucno</option>
                  <option value="web">Online</option>
                </select>
              </div>
              <div className="form-row form-row--full">
                <label htmlFor="notes">Napomena</label>
                <textarea
                  id="notes"
                  name="notes"
                  className="textarea"
                  value={formState.notes}
                  onChange={handleInputChange}
                />
              </div>
            </div>
            {formStatus.type !== "idle" && formStatus.message && (
              <div className={`form-status ${formStatus.type}`}>{formStatus.message}</div>
            )}
            <div className="admin-actions">
              {editingId && (
                <button
                  className="button outline"
                  type="button"
                  onClick={() => resetForm({ date: formState.date })}
                >
                  Otkazi izmenu
                </button>
              )}
              <button className="button" type="submit">
                {editingId ? "Sacuvaj izmene" : "Sacuvaj termin"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AdminShell>
  );
}
