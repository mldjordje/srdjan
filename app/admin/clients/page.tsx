"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";

import AdminShell from "@/components/admin/AdminShell";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";
const adminKey = process.env.NEXT_PUBLIC_ADMIN_KEY || "";

type Client = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  description?: string;
  createdAt?: string;
  appointmentCount?: number;
  lastAppointment?: string;
};

type StatusState = {
  type: "idle" | "loading" | "success" | "error";
  message?: string;
};

export default function AdminClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [status, setStatus] = useState<StatusState>({ type: "idle" });
  const [formStatus, setFormStatus] = useState<StatusState>({ type: "idle" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formState, setFormState] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    description: "",
  });

  const fetchClients = async () => {
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
      setStatus({ type: "success", message: "Lista klijenata je osvezena." });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Doslo je do greske.";
      setStatus({ type: "error", message });
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setFormState({
      name: "",
      phone: "",
      email: "",
      address: "",
      description: "",
    });
    setFormStatus({ type: "idle" });
  };

  const handleEdit = (client: Client) => {
    setEditingId(client.id);
    setFormState({
      name: client.name || "",
      phone: client.phone || "",
      email: client.email || "",
      address: client.address || "",
      description: client.description || "",
    });
    setFormStatus({ type: "idle" });
  };

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    setFormState((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!apiBaseUrl) {
      setFormStatus({
        type: "error",
        message: "API nije podesen. Dodaj NEXT_PUBLIC_API_BASE_URL u .env.",
      });
      return;
    }

    if (!adminKey) {
      setFormStatus({
        type: "error",
        message: "Dodaj NEXT_PUBLIC_ADMIN_KEY u .env da bi CMS radio.",
      });
      return;
    }

    if (!editingId || !formState.name.trim() || !formState.phone.trim()) {
      setFormStatus({
        type: "error",
        message: "Unesi ime klijenta i telefon.",
      });
      return;
    }

    setFormStatus({ type: "loading" });

    try {
      const response = await fetch(`${apiBaseUrl}/clients.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Key": adminKey,
        },
        body: JSON.stringify({
          adminAction: "update",
          id: editingId,
          name: formState.name.trim(),
          phone: formState.phone.trim(),
          email: formState.email.trim(),
          address: formState.address.trim(),
          description: formState.description.trim(),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Ne mogu da sacuvam klijenta.");
      }

      setFormStatus({ type: "success", message: "Klijent je sacuvan." });
      resetForm();
      fetchClients();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Doslo je do greske.";
      setFormStatus({ type: "error", message });
    }
  };

  return (
    <AdminShell
      title="Klijenti"
      subtitle={`Ukupno klijenata: ${clients.length}`}
    >
      <div className="admin-grid">
        <div className="admin-toolbar">
          <button className="button" type="button" onClick={fetchClients}>
            Osvezi listu
          </button>
          {status.type !== "idle" && status.message && (
            <div className={`form-status ${status.type}`}>{status.message}</div>
          )}
        </div>

        {clients.length === 0 && status.type !== "loading" && (
          <div className="admin-card">Nema registrovanih klijenata.</div>
        )}

        {clients.map((client) => (
          <div key={client.id} className="admin-card">
            <strong>{client.name}</strong>
            <span>{client.phone}</span>
            {client.email && <span>{client.email}</span>}
            {client.appointmentCount !== undefined && (
              <span>Broj termina: {client.appointmentCount}</span>
            )}
            {client.lastAppointment && <span>Poslednji termin: {client.lastAppointment}</span>}
            {client.createdAt && <span>Registracija: {client.createdAt}</span>}
            {client.address && <span>Adresa: {client.address}</span>}
            {client.description && <span>Opis: {client.description}</span>}
            <div className="admin-actions">
              <button className="button outline" type="button" onClick={() => handleEdit(client)}>
                Izmeni
              </button>
            </div>
          </div>
        ))}
        <div className="admin-card">
          <h3>{editingId ? "Izmeni klijenta" : "Izaberi klijenta za izmenu"}</h3>
          {editingId ? (
            <form className="form-row" onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-row">
                  <label htmlFor="name">Ime i prezime</label>
                  <input
                    id="name"
                    name="name"
                    className="input"
                    value={formState.name}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="form-row">
                  <label htmlFor="phone">Telefon</label>
                  <input
                    id="phone"
                    name="phone"
                    className="input"
                    value={formState.phone}
                    onChange={handleChange}
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
                    onChange={handleChange}
                  />
                </div>
                <div className="form-row">
                  <label htmlFor="address">Adresa</label>
                  <input
                    id="address"
                    name="address"
                    className="input"
                    value={formState.address}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-row form-row--full">
                  <label htmlFor="description">Opis klijenta</label>
                  <textarea
                    id="description"
                    name="description"
                    className="textarea"
                    value={formState.description}
                    onChange={handleChange}
                  />
                </div>
              </div>
              {formStatus.type !== "idle" && formStatus.message && (
                <div className={`form-status ${formStatus.type}`}>{formStatus.message}</div>
              )}
              <div className="admin-actions">
                <button className="button outline" type="button" onClick={resetForm}>
                  Otkazi
                </button>
                <button className="button" type="submit">
                  Sacuvaj izmene
                </button>
              </div>
            </form>
          ) : (
            <p>Izaberi klijenta iz liste da bi izmenio podatke.</p>
          )}
        </div>
      </div>
    </AdminShell>
  );
}









