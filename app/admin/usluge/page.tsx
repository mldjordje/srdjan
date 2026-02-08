"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";

import AdminShell from "@/components/admin/AdminShell";
import { fetchServices, services as fallbackServices, type Service } from "@/lib/services";
import { useLanguage, type Language } from "@/lib/useLanguage";

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
  const { language } = useLanguage();
  const locale = language === "sr" ? "sr-RS" : language === "en" ? "en-US" : "it-IT";
  const text: Record<Language, Record<string, string>> = {
    sr: {
      apiMissing: "API nije podesen. Dodaj NEXT_PUBLIC_API_BASE_URL u .env.",
      adminMissing: "Dodaj NEXT_PUBLIC_ADMIN_KEY u .env da bi CMS radio.",
      refreshed: "Usluge su osvezene.",
      genericError: "Doslo je do greske.",
      enterNameDuration: "Unesi naziv i trajanje usluge.",
      cannotSave: "Ne mogu da sacuvam uslugu.",
      updated: "Usluga je izmenjena.",
      saved: "Usluga je sacuvana.",
      cannotChangeStatus: "Ne mogu da promenim status.",
      confirmDelete: "Da li sigurno zelis da obrises uslugu?",
      cannotDelete: "Ne mogu da obrisem uslugu.",
      title: "Usluge",
      subtitlePrefix: "Ukupno usluga:",
      refresh: "Osvezi listu",
      noItems: "Nema usluga za prikaz.",
      duration: "Trajanje:",
      price: "Cena:",
      description: "Opis:",
      status: "Status:",
      inactive: "Neaktivna",
      active: "Aktivna",
      edit: "Izmeni",
      activate: "Aktiviraj",
      deactivate: "Deaktiviraj",
      delete: "Obrisi",
      editService: "Izmeni uslugu",
      newService: "Nova usluga",
      serviceName: "Naziv usluge",
      serviceDuration: "Trajanje",
      servicePrice: "Cena",
      serviceColor: "Boja termina",
      serviceDesc: "Opis",
      serviceActive: "Aktivna",
      cancel: "Otkazi",
      saveChanges: "Sacuvaj izmene",
      saveService: "Sacuvaj uslugu",
    },
    en: {
      apiMissing: "API is not configured. Add NEXT_PUBLIC_API_BASE_URL to .env.",
      adminMissing: "Add NEXT_PUBLIC_ADMIN_KEY to .env so CMS can work.",
      refreshed: "Services refreshed.",
      genericError: "Something went wrong.",
      enterNameDuration: "Enter service name and duration.",
      cannotSave: "Unable to save service.",
      updated: "Service updated.",
      saved: "Service saved.",
      cannotChangeStatus: "Unable to change status.",
      confirmDelete: "Are you sure you want to delete this service?",
      cannotDelete: "Unable to delete service.",
      title: "Services",
      subtitlePrefix: "Total services:",
      refresh: "Refresh list",
      noItems: "No services to show.",
      duration: "Duration:",
      price: "Price:",
      description: "Description:",
      status: "Status:",
      inactive: "Inactive",
      active: "Active",
      edit: "Edit",
      activate: "Activate",
      deactivate: "Deactivate",
      delete: "Delete",
      editService: "Edit service",
      newService: "New service",
      serviceName: "Service name",
      serviceDuration: "Duration",
      servicePrice: "Price",
      serviceColor: "Appointment color",
      serviceDesc: "Description",
      serviceActive: "Active",
      cancel: "Cancel",
      saveChanges: "Save changes",
      saveService: "Save service",
    },
    it: {
      apiMissing: "API non configurata. Aggiungi NEXT_PUBLIC_API_BASE_URL in .env.",
      adminMissing: "Aggiungi NEXT_PUBLIC_ADMIN_KEY in .env per usare il CMS.",
      refreshed: "Servizi aggiornati.",
      genericError: "Si e verificato un errore.",
      enterNameDuration: "Inserisci nome servizio e durata.",
      cannotSave: "Impossibile salvare il servizio.",
      updated: "Servizio aggiornato.",
      saved: "Servizio salvato.",
      cannotChangeStatus: "Impossibile cambiare stato.",
      confirmDelete: "Sei sicuro di voler eliminare questo servizio?",
      cannotDelete: "Impossibile eliminare il servizio.",
      title: "Servizi",
      subtitlePrefix: "Servizi totali:",
      refresh: "Aggiorna elenco",
      noItems: "Nessun servizio da mostrare.",
      duration: "Durata:",
      price: "Prezzo:",
      description: "Descrizione:",
      status: "Stato:",
      inactive: "Non attivo",
      active: "Attivo",
      edit: "Modifica",
      activate: "Attiva",
      deactivate: "Disattiva",
      delete: "Elimina",
      editService: "Modifica servizio",
      newService: "Nuovo servizio",
      serviceName: "Nome servizio",
      serviceDuration: "Durata",
      servicePrice: "Prezzo",
      serviceColor: "Colore appuntamento",
      serviceDesc: "Descrizione",
      serviceActive: "Attivo",
      cancel: "Annulla",
      saveChanges: "Salva modifiche",
      saveService: "Salva servizio",
    },
  };
  const t = text[language];
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
        message: t.apiMissing,
      });
      return;
    }

    if (!adminKey) {
      setStatus({
        type: "error",
        message: t.adminMissing,
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
      setStatus({ type: "success", message: t.refreshed });
    } catch (error) {
      const message = error instanceof Error ? error.message : t.genericError;
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
        message: t.apiMissing,
      });
      return;
    }

    if (!adminKey) {
      setFormStatus({
        type: "error",
        message: t.adminMissing,
      });
      return;
    }

    if (!formState.name.trim() || !formState.duration.trim()) {
      setFormStatus({
        type: "error",
        message: t.enterNameDuration,
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
        throw new Error(data?.message || t.cannotSave);
      }

      setFormStatus({
        type: "success",
        message: editingId ? t.updated : t.saved,
      });
      resetForm();
      fetchServiceItems();
    } catch (error) {
      const message = error instanceof Error ? error.message : t.genericError;
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
        throw new Error(data?.message || t.cannotChangeStatus);
      }

      fetchServiceItems();
    } catch (error) {
      const message = error instanceof Error ? error.message : t.genericError;
      setStatus({ type: "error", message });
    }
  };

  const handleDelete = async (id: string) => {
    if (!apiBaseUrl || !adminKey) {
      return;
    }

    const confirmed = window.confirm(t.confirmDelete);
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
        throw new Error(data?.message || t.cannotDelete);
      }

      fetchServiceItems();
    } catch (error) {
      const message = error instanceof Error ? error.message : t.genericError;
      setStatus({ type: "error", message });
    }
  };

  return (
    <AdminShell
      title={t.title}
      subtitle={`${t.subtitlePrefix} ${services.length}`}
    >
      <div className="admin-grid">
        <div className="admin-toolbar">
          <button className="button" type="button" onClick={fetchServiceItems}>
            {t.refresh}
          </button>
          {status.type !== "idle" && status.message && (
            <div className={`form-status ${status.type}`}>{status.message}</div>
          )}
        </div>

        {services.length === 0 && status.type !== "loading" && (
          <div className="admin-card">{t.noItems}</div>
        )}

        {services.map((service) => (
          <div key={service.id} className="admin-card">
            <strong>{service.name}</strong>
            <span>{t.duration} {service.duration}</span>
            <span>{t.price} RSD {service.price?.toLocaleString(locale)}</span>
            {service.description && <span>{t.description} {service.description}</span>}
            {service.color && (
              <span className="service-color">
                <span
                  className="service-color__dot"
                  style={{ backgroundColor: service.color }}
                />
                {service.color}
              </span>
            )}
            <span>{t.status} {service.isActive === false ? t.inactive : t.active}</span>
            <div className="admin-actions">
              <button className="button outline" type="button" onClick={() => handleEdit(service)}>
                {t.edit}
              </button>
              <button className="button outline" type="button" onClick={() => handleToggleActive(service.id)}>
                {service.isActive === false ? t.activate : t.deactivate}
              </button>
              <button className="button outline" type="button" onClick={() => handleDelete(service.id)}>
                {t.delete}
              </button>
            </div>
          </div>
        ))}

        <div
          className={`admin-card${editingId ? " is-editing" : ""}`}
          ref={editCardRef}
        >
          <h3>{editingId ? t.editService : t.newService}</h3>
          <form className="form-row" onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-row">
                <label htmlFor="service-name">{t.serviceName}</label>
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
                <label htmlFor="service-duration">{t.serviceDuration}</label>
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
                <label htmlFor="service-price">{t.servicePrice}</label>
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
                <label htmlFor="service-color">{t.serviceColor}</label>
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
                <label htmlFor="service-description">{t.serviceDesc}</label>
                <textarea
                  id="service-description"
                  name="description"
                  className="textarea"
                  value={formState.description}
                  onChange={handleChange}
                />
              </div>
              <div className="form-row">
                <label htmlFor="service-active">{t.serviceActive}</label>
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
                  {t.cancel}
                </button>
              )}
              <button className="button" type="submit">
                {editingId ? t.saveChanges : t.saveService}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AdminShell>
  );
}
