"use client";

import { useEffect, useState } from "react";

import AdminShell from "@/components/admin/AdminShell";
import { useLanguage, type Language } from "@/lib/useLanguage";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";
const adminKey = process.env.NEXT_PUBLIC_ADMIN_KEY || "";

type Notification = {
  id: string;
  type: string;
  message: string;
  relatedBookingId?: string | number | null;
  createdAt?: string;
  readAt?: string | null;
};

type StatusState = {
  type: "idle" | "loading" | "success" | "error";
  message?: string;
};

export default function AdminNotificationsPage() {
  const { language } = useLanguage();
  const text: Record<Language, Record<string, string>> = {
    sr: {
      apiMissing: "API nije podesen. Dodaj NEXT_PUBLIC_API_BASE_URL u .env.",
      adminMissing: "Dodaj NEXT_PUBLIC_ADMIN_KEY u .env da bi CMS radio.",
      cannotLoad: "Ne mogu da preuzmem notifikacije.",
      refreshed: "Notifikacije su osvezene.",
      genericError: "Doslo je do greske.",
      cannotMark: "Ne mogu da oznacim procitano.",
      markedAll: "Sve notifikacije su procitane.",
      title: "Notifikacije",
      total: "Ukupno",
      unread: "Neprocitano",
      refreshList: "Osvezi listu",
      markAllRead: "Oznaci sve kao procitano",
      noItems: "Nema novih notifikacija.",
      created: "Kreirano",
      appointmentId: "Termin ID",
      markRead: "Oznaci procitano",
    },
    en: {
      apiMissing: "API is not configured. Add NEXT_PUBLIC_API_BASE_URL to .env.",
      adminMissing: "Add NEXT_PUBLIC_ADMIN_KEY to .env so CMS can work.",
      cannotLoad: "Unable to load notifications.",
      refreshed: "Notifications refreshed.",
      genericError: "Something went wrong.",
      cannotMark: "Unable to mark as read.",
      markedAll: "All notifications marked as read.",
      title: "Notifications",
      total: "Total",
      unread: "Unread",
      refreshList: "Refresh list",
      markAllRead: "Mark all as read",
      noItems: "No new notifications.",
      created: "Created",
      appointmentId: "Appointment ID",
      markRead: "Mark read",
    },
    it: {
      apiMissing: "API non configurata. Aggiungi NEXT_PUBLIC_API_BASE_URL in .env.",
      adminMissing: "Aggiungi NEXT_PUBLIC_ADMIN_KEY in .env per usare il CMS.",
      cannotLoad: "Impossibile caricare le notifiche.",
      refreshed: "Notifiche aggiornate.",
      genericError: "Si e verificato un errore.",
      cannotMark: "Impossibile segnare come letto.",
      markedAll: "Tutte le notifiche sono state segnate come lette.",
      title: "Notifiche",
      total: "Totale",
      unread: "Non lette",
      refreshList: "Aggiorna elenco",
      markAllRead: "Segna tutto come letto",
      noItems: "Nessuna nuova notifica.",
      created: "Creato",
      appointmentId: "ID appuntamento",
      markRead: "Segna come letto",
    },
  };
  const t = text[language];
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [status, setStatus] = useState<StatusState>({ type: "idle" });

  const fetchNotifications = async () => {
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
      const response = await fetch(
        `${apiBaseUrl}/notifications.php?limit=100&includeUnreadCount=1`,
        {
          headers: {
            "X-Admin-Key": adminKey,
          },
        }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || t.cannotLoad);
      }

      const items = Array.isArray(data.notifications) ? data.notifications : [];
      setNotifications(items);
      setStatus({ type: "success", message: t.refreshed });
    } catch (error) {
      const message = error instanceof Error ? error.message : t.genericError;
      setStatus({ type: "error", message });
    }
  };

  const markAllRead = async () => {
    if (!apiBaseUrl || !adminKey) {
      return;
    }

    setStatus({ type: "loading" });

    try {
      const response = await fetch(`${apiBaseUrl}/notifications.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Key": adminKey,
        },
        body: JSON.stringify({ adminAction: "mark_all_read" }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || t.cannotMark);
      }

      setNotifications((prev) =>
        prev.map((item) => ({
          ...item,
          readAt: item.readAt ?? new Date().toISOString(),
        }))
      );
      setStatus({ type: "success", message: t.markedAll });
    } catch (error) {
      const message = error instanceof Error ? error.message : t.genericError;
      setStatus({ type: "error", message });
    }
  };

  const markRead = async (id: string) => {
    if (!apiBaseUrl || !adminKey) {
      return;
    }

    try {
      const response = await fetch(`${apiBaseUrl}/notifications.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Key": adminKey,
        },
        body: JSON.stringify({ adminAction: "mark_read", id }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || t.cannotMark);
      }

      setNotifications((prev) =>
        prev.map((item) => (item.id === id ? { ...item, readAt: new Date().toISOString() } : item))
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : t.genericError;
      setStatus({ type: "error", message });
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const unreadCount = notifications.filter((item) => !item.readAt).length;

  return (
    <AdminShell
      title={t.title}
      subtitle={`${t.total}: ${notifications.length} | ${t.unread}: ${unreadCount}`}
    >
      <div className="admin-grid">
        <div className="admin-toolbar">
          <button className="button" type="button" onClick={fetchNotifications}>
            {t.refreshList}
          </button>
          <button className="button outline" type="button" onClick={markAllRead}>
            {t.markAllRead}
          </button>
          {status.type !== "idle" && status.message && (
            <div className={`form-status ${status.type}`}>{status.message}</div>
          )}
        </div>

        {notifications.length === 0 && status.type !== "loading" && (
          <div className="admin-card">{t.noItems}</div>
        )}

        {notifications.map((item) => (
          <div
            key={item.id}
            className={`admin-card notification-card${item.readAt ? "" : " unread"}`}
          >
            <strong>{item.type}</strong>
            <span>{item.message}</span>
            {item.createdAt && <span>{t.created}: {item.createdAt}</span>}
            {item.relatedBookingId && (
              <span>{t.appointmentId}: {item.relatedBookingId}</span>
            )}
            <div className="admin-actions">
              {!item.readAt && (
                <button
                  className="button outline"
                  type="button"
                  onClick={() => markRead(String(item.id))}
                >
                  {t.markRead}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </AdminShell>
  );
}
