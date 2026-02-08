"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";

import AdminShell from "@/components/admin/AdminShell";
import { useLanguage, type Language } from "@/lib/useLanguage";

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
  const { language } = useLanguage();
  const text: Record<
    Language,
    Record<string, string>
  > = {
    sr: {
      apiMissing: "API nije podesen. Dodaj NEXT_PUBLIC_API_BASE_URL u .env.",
      adminMissing: "Dodaj NEXT_PUBLIC_ADMIN_KEY u .env da bi CMS radio.",
      cannotLoad: "Ne mogu da preuzmem klijente.",
      listRefreshed: "Lista klijenata je osvezena.",
      genericError: "Doslo je do greske.",
      fillClient: "Unesi ime klijenta i telefon.",
      cannotSave: "Ne mogu da sacuvam klijenta.",
      saved: "Klijent je sacuvan.",
      title: "Klijenti",
      subtitlePrefix: "Ukupno klijenata:",
      refreshList: "Osvezi listu",
      noClients: "Nema registrovanih klijenata.",
      editClient: "Izmeni klijenta",
      selectClient: "Izaberi klijenta za izmenu",
      fullName: "Ime i prezime",
      phone: "Telefon",
      emailOptional: "Email (opciono)",
      address: "Adresa",
      clientDesc: "Opis klijenta",
      cancel: "Otkazi",
      saveChanges: "Sacuvaj izmene",
      pickClientInfo: "Izaberi klijenta iz liste da bi izmenio podatke.",
    },
    en: {
      apiMissing: "API is not configured. Add NEXT_PUBLIC_API_BASE_URL to .env.",
      adminMissing: "Add NEXT_PUBLIC_ADMIN_KEY to .env so CMS can work.",
      cannotLoad: "Unable to load clients.",
      listRefreshed: "Client list refreshed.",
      genericError: "Something went wrong.",
      fillClient: "Enter client name and phone.",
      cannotSave: "Unable to save client.",
      saved: "Client saved.",
      title: "Clients",
      subtitlePrefix: "Total clients:",
      refreshList: "Refresh list",
      noClients: "No registered clients.",
      editClient: "Edit client",
      selectClient: "Select client to edit",
      fullName: "Full name",
      phone: "Phone",
      emailOptional: "Email (optional)",
      address: "Address",
      clientDesc: "Client notes",
      cancel: "Cancel",
      saveChanges: "Save changes",
      pickClientInfo: "Select a client from the list to edit details.",
    },
    it: {
      apiMissing: "API non configurata. Aggiungi NEXT_PUBLIC_API_BASE_URL in .env.",
      adminMissing: "Aggiungi NEXT_PUBLIC_ADMIN_KEY in .env per usare il CMS.",
      cannotLoad: "Impossibile caricare i clienti.",
      listRefreshed: "Elenco clienti aggiornato.",
      genericError: "Si e verificato un errore.",
      fillClient: "Inserisci nome cliente e telefono.",
      cannotSave: "Impossibile salvare il cliente.",
      saved: "Cliente salvato.",
      title: "Clienti",
      subtitlePrefix: "Clienti totali:",
      refreshList: "Aggiorna elenco",
      noClients: "Nessun cliente registrato.",
      editClient: "Modifica cliente",
      selectClient: "Seleziona cliente da modificare",
      fullName: "Nome e cognome",
      phone: "Telefono",
      emailOptional: "Email (opzionale)",
      address: "Indirizzo",
      clientDesc: "Note cliente",
      cancel: "Annulla",
      saveChanges: "Salva modifiche",
      pickClientInfo: "Seleziona un cliente dall'elenco per modificare i dati.",
    },
  };
  const t = text[language];
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
  const editCardRef = useRef<HTMLDivElement | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  const fetchClients = async () => {
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
      const response = await fetch(`${apiBaseUrl}/clients.php`, {
        headers: {
          "X-Admin-Key": adminKey,
        },
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || t.cannotLoad);
      }

      const items = Array.isArray(data.clients) ? data.clients : [];
      setClients(items);
      setStatus({ type: "success", message: t.listRefreshed });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t.genericError;
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
    requestAnimationFrame(() => {
      editCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      nameInputRef.current?.focus();
    });
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

    if (!editingId || !formState.name.trim() || !formState.phone.trim()) {
      setFormStatus({
        type: "error",
        message: t.fillClient,
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
        throw new Error(data?.message || t.cannotSave);
      }

      setFormStatus({ type: "success", message: t.saved });
      resetForm();
      fetchClients();
    } catch (error) {
      const message = error instanceof Error ? error.message : t.genericError;
      setFormStatus({ type: "error", message });
    }
  };

  return (
    <AdminShell
      title={t.title}
      subtitle={`${t.subtitlePrefix} ${clients.length}`}
    >
      <div className="admin-grid">
        <div className="admin-toolbar">
          <button className="button" type="button" onClick={fetchClients}>
            {t.refreshList}
          </button>
          {status.type !== "idle" && status.message && (
            <div className={`form-status ${status.type}`}>{status.message}</div>
          )}
        </div>

        {clients.length === 0 && status.type !== "loading" && (
          <div className="admin-card">{t.noClients}</div>
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
        <div
          className={`admin-card${editingId ? " is-editing" : ""}`}
          ref={editCardRef}
        >
          <h3>{editingId ? t.editClient : t.selectClient}</h3>
          {editingId ? (
            <form className="form-row" onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-row">
                  <label htmlFor="name">{t.fullName}</label>
                  <input
                    id="name"
                    name="name"
                    className="input"
                    value={formState.name}
                    onChange={handleChange}
                    ref={nameInputRef}
                    required
                  />
                </div>
                <div className="form-row">
                  <label htmlFor="phone">{t.phone}</label>
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
                  <label htmlFor="email">{t.emailOptional}</label>
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
                  <label htmlFor="address">{t.address}</label>
                  <input
                    id="address"
                    name="address"
                    className="input"
                    value={formState.address}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-row form-row--full">
                  <label htmlFor="description">{t.clientDesc}</label>
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
                  {t.cancel}
                </button>
                <button className="button" type="submit">
                  {t.saveChanges}
                </button>
              </div>
            </form>
          ) : (
            <p>{t.pickClientInfo}</p>
          )}
        </div>
      </div>
    </AdminShell>
  );
}









