"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";

import AdminShell from "@/components/admin/AdminShell";
import { fetchServices, services as fallbackServices, type Service } from "@/lib/services";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";
const adminKey = process.env.NEXT_PUBLIC_ADMIN_KEY || "";

type StatusState = {
  type: "idle" | "loading" | "success" | "error";
  message?: string;
};

type ServiceFormState = {
  name: string;
  duration: string;
  price: string;
  description: string;
  color: string;
  isActive: boolean;
};

const buildDefaultFormState = (overrides: Partial<ServiceFormState> = {}): ServiceFormState => ({
  name: "",
  duration: "",
  price: "",
  description: "",
  color: "#111111",
  isActive: true,
  ...overrides,
});

export default function AdminServicesPage() {
  const [services, setServices] = useState<Service[]>(fallbackServices);
  const [status, setStatus] = useState<StatusState>({ type: "idle" });
  const [formStatus, setFormStatus] = useState<StatusState>({ type: "idle" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formState, setFormState] = useState<ServiceFormState>(
    buildDefaultFormState()
  );
  const editCardRef = useRef<HTMLDivElement | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  const fetchServiceItems = async () => {
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
      const items = await fetchServices(apiBaseUrl, {
        adminKey,
        includeInactive: true,
      });
      setServices(items);
      setStatus({ type: "success", message: "Usluge su osvezene." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Doslo je do greske.";
      setStatus({ type: "error", message });
    }
  };

  useEffect(() => {
    fetchServiceItems();
  }, []);

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const target = event.currentTarget;
    const nextValue =
      target instanceof HTMLInputElement && target.type === "checkbox"
        ? target.checked
        : target.value;
    setFormState((prev) => ({
      ...prev,
      [target.name]: nextValue,
    }));
  };

  const handleEdit = (service: Service) => {
    setEditingId(service.id);
    setFormState(
      buildDefaultFormState({
        name: service.name || "",
        duration: service.duration || "",
        price: service.price ? String(service.price) : "",
        description: service.description || "",
        color: service.color || "#111111",
        isActive: service.isActive !== false,
      })
    );
    setFormStatus({ type: "idle" });
    requestAnimationFrame(() => {
      editCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      nameInputRef.current?.focus();
    });
  };

  const resetForm = () => {
    setEditingId(null);
    setFormState(buildDefaultFormState());
    setFormStatus({ type: "idle" });
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

    if (!formState.name.trim() || !formState.duration.trim()) {
      setFormStatus({
        type: "error",
        message: "Unesi naziv i trajanje usluge.",
      });
      return;
    }

    setFormStatus({ type: "loading" });

    try {
      const response = await fetch(`${apiBaseUrl}/services.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Key": adminKey,
        },
        body: JSON.stringify({
          adminAction: editingId ? "update" : "create",
          id: editingId ?? undefined,
          name: formState.name.trim(),
          duration: formState.duration.trim(),
          price: Number(formState.price) || 0,
          description: formState.description.trim(),
          color: formState.color.trim(),
          isActive: formState.isActive ? 1 : 0,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Ne mogu da sacuvam uslugu.");
      }

      setFormStatus({
        type: "success",
        message: editingId ? "Usluga je izmenjena." : "Usluga je sacuvana.",
      });
      resetForm();
      fetchServiceItems();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Doslo je do greske.";
      setFormStatus({ type: "error", message });
    }
  };

  const handleToggleActive = async (id: string) => {
    if (!apiBaseUrl || !adminKey) {
      return;
    }

    try {
      const response = await fetch(`${apiBaseUrl}/services.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Key": adminKey,
        },
        body: JSON.stringify({ adminAction: "toggle_active", id }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Ne mogu da promenim status.");
      }

      fetchServiceItems();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Doslo je do greske.";
      setStatus({ type: "error", message });
    }
  };

  const handleDelete = async (id: string) => {
    if (!apiBaseUrl || !adminKey) {
      return;
    }

    const confirmed = window.confirm("Da li sigurno zelis da obrises uslugu?");
    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`${apiBaseUrl}/services.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Key": adminKey,
        },
        body: JSON.stringify({ adminAction: "delete", id }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Ne mogu da obrisem uslugu.");
      }

      fetchServiceItems();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Doslo je do greske.";
      setStatus({ type: "error", message });
    }
  };

  return (
    <AdminShell
      title="Usluge"
      subtitle={`Ukupno usluga: ${services.length}`}
    >
      <div className="admin-grid">
        <div className="admin-toolbar">
          <button className="button" type="button" onClick={fetchServiceItems}>
            Osvezi listu
          </button>
          {status.type !== "idle" && status.message && (
            <div className={`form-status ${status.type}`}>{status.message}</div>
          )}
        </div>

        {services.length === 0 && status.type !== "loading" && (
          <div className="admin-card">Nema usluga za prikaz.</div>
        )}

        {services.map((service) => (
          <div key={service.id} className="admin-card">
            <strong>{service.name}</strong>
            <span>Trajanje: {service.duration}</span>
            <span>Cena: RSD {service.price?.toLocaleString("sr-RS")}</span>
            {service.description && <span>Opis: {service.description}</span>}
            {service.color && (
              <span className="service-color">
                <span
                  className="service-color__dot"
                  style={{ backgroundColor: service.color }}
                />
                {service.color}
              </span>
            )}
            <span>Status: {service.isActive === false ? "Neaktivna" : "Aktivna"}</span>
            <div className="admin-actions">
              <button className="button outline" type="button" onClick={() => handleEdit(service)}>
                Izmeni
              </button>
              <button className="button outline" type="button" onClick={() => handleToggleActive(service.id)}>
                {service.isActive === false ? "Aktiviraj" : "Deaktiviraj"}
              </button>
              <button className="button outline" type="button" onClick={() => handleDelete(service.id)}>
                Obrisi
              </button>
            </div>
          </div>
        ))}

        <div
          className={`admin-card${editingId ? " is-editing" : ""}`}
          ref={editCardRef}
        >
          <h3>{editingId ? "Izmeni uslugu" : "Nova usluga"}</h3>
          <form className="form-row" onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-row">
                <label htmlFor="service-name">Naziv usluge</label>
                <input
                  id="service-name"
                  name="name"
                  className="input"
                  value={formState.name}
                  onChange={handleChange}
                  ref={nameInputRef}
                  required
                />
              </div>
              <div className="form-row">
                <label htmlFor="service-duration">Trajanje</label>
                <input
                  id="service-duration"
                  name="duration"
                  className="input"
                  value={formState.duration}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-row">
                <label htmlFor="service-price">Cena</label>
                <input
                  id="service-price"
                  name="price"
                  className="input"
                  type="number"
                  min="0"
                  value={formState.price}
                  onChange={handleChange}
                />
              </div>
              <div className="form-row">
                <label htmlFor="service-color">Boja termina</label>
                <input
                  id="service-color"
                  name="color"
                  className="input input--color"
                  type="color"
                  value={formState.color}
                  onChange={handleChange}
                />
              </div>
              <div className="form-row form-row--full">
                <label htmlFor="service-description">Opis</label>
                <textarea
                  id="service-description"
                  name="description"
                  className="textarea"
                  value={formState.description}
                  onChange={handleChange}
                />
              </div>
              <div className="form-row">
                <label htmlFor="service-active">Aktivna</label>
                <input
                  id="service-active"
                  name="isActive"
                  type="checkbox"
                  checked={formState.isActive}
                  onChange={handleChange}
                />
              </div>
            </div>
            {formStatus.type !== "idle" && formStatus.message && (
              <div className={`form-status ${formStatus.type}`}>{formStatus.message}</div>
            )}
            <div className="admin-actions">
              {editingId && (
                <button className="button outline" type="button" onClick={resetForm}>
                  Otkazi
                </button>
              )}
              <button className="button" type="submit">
                {editingId ? "Sacuvaj izmene" : "Sacuvaj uslugu"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AdminShell>
  );
}
