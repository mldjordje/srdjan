"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type AdminMe = {
  id: string;
  username: string;
  role: "owner" | "staff-admin";
};

type Props = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  hideHeader?: boolean;
  fullWidth?: boolean;
};

const navItems = [
  { href: "/admin/staff", label: "Staff", ownerOnly: false },
  { href: "/admin/dashboard", label: "Dashboard", ownerOnly: true },
  { href: "/admin/radnici", label: "Radnici", ownerOnly: true },
  { href: "/admin/zarada", label: "Zarada", ownerOnly: true },
  { href: "/admin/calendar", label: "Kalendar", ownerOnly: false },
  { href: "/admin/termini", label: "Termini", ownerOnly: false },
  { href: "/admin/usluge", label: "Usluge", ownerOnly: false },
  { href: "/admin/clients", label: "Klijenti", ownerOnly: false },
  { href: "/admin/notifications", label: "Notifikacije", ownerOnly: false },
  { href: "/admin/tutorial", label: "Tutorial", ownerOnly: false },
  { href: "/admin/tutorial-owner", label: "Owner tutorial", ownerOnly: true },
  { href: "/admin/settings", label: "Podesavanja", ownerOnly: true },
];

const isPathActive = (pathname: string, href: string) => {
  if (pathname === href) {
    return true;
  }
  if (href === "/admin/termini" && pathname === "/admin/appointments") {
    return true;
  }
  return pathname.startsWith(`${href}/`);
};

export default function AdminShell({
  title,
  subtitle,
  children,
  hideHeader = false,
  fullWidth = false,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const response = await fetch("/api/admin/me");
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Niste prijavljeni.");
        setLoading(false);
        return;
      }
      setAdmin(data);
      setLoading(false);
    };
    load().catch(() => {
      setError("Niste prijavljeni.");
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!admin) {
      return;
    }
    const activeRoute = navItems.find((item) => isPathActive(pathname, item.href));
    if (activeRoute?.ownerOnly && admin.role !== "owner") {
      router.replace("/admin/staff");
    }
  }, [admin, pathname, router]);

  useEffect(() => {
    if (!admin) {
      return;
    }
    const loadNotifications = async () => {
      const response = await fetch("/api/admin/notifications");
      const payload = await response.json();
      if (!response.ok) {
        setNotificationCount(0);
        return;
      }
      const unread = Array.isArray(payload.notifications)
        ? payload.notifications.filter((item: { is_read?: boolean }) => !item.is_read).length
        : 0;
      setNotificationCount(unread);
    };
    loadNotifications().catch(() => setNotificationCount(0));
  }, [admin, pathname]);

  const logout = async () => {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    router.push("/admin");
  };

  const handleNavClose = () => {
    setIsNavOpen(false);
  };

  if (loading) {
    return (
      <main className="container" style={{ paddingTop: 24 }}>
        <p>Ucitavanje admin panela...</p>
      </main>
    );
  }

  if (!admin) {
    return (
      <div className="page">
        <main className="container" style={{ paddingTop: 24 }}>
          <h1>Admin</h1>
          <p className="form-status error">{error || "Niste prijavljeni."}</p>
          <Link className="button" href="/admin">
            Idi na prijavu
          </Link>
        </main>
      </div>
    );
  }

  const roleLabel = admin.role === "owner" ? "Owner" : "Staff";

  return (
    <div className="page">
      <header className={`nav nav--has-toggle nav--dropdown${isNavOpen ? " is-open" : ""}`}>
        <div className="container nav-inner">
          <div className="nav-top">
            <Link className="brand" href="/">
              <div className="brand-mark">
                <span className="brand-mark__text">FS</span>
              </div>
              <div className="brand-title">
                <span>Frizerski salon Srdjan</span>
                <span>Admin panel</span>
              </div>
            </Link>
            <button
              className="nav-toggle"
              type="button"
              aria-expanded={isNavOpen}
              aria-controls="admin-navigation"
              onClick={() => setIsNavOpen((prev) => !prev)}
            >
              <span className="nav-toggle__label">Meni</span>
              <span className="nav-toggle__icon" aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
            </button>
          </div>
          <nav id="admin-navigation" className={`nav-links${isNavOpen ? " is-open" : ""}`}>
            <Link href="/" onClick={handleNavClose}>
              Pocetna
            </Link>
            <Link href="/#booking" onClick={handleNavClose}>
              Zakazi termin
            </Link>
            {navItems
              .filter((item) => (item.ownerOnly ? admin.role === "owner" : true))
              .map((item) => {
                const isActive = isPathActive(pathname, item.href);
                const showBadge =
                  item.href === "/admin/notifications" && notificationCount > 0;
                return (
                  <Link
                    key={item.href}
                    className={`admin-link ${isActive ? "is-active" : ""}`}
                    href={item.href}
                    onClick={handleNavClose}
                  >
                    <span>{item.label}</span>
                    {showBadge && <span className="nav-badge">{notificationCount}</span>}
                  </Link>
                );
              })}
            <button
              className="button small ghost"
              type="button"
              onClick={() => {
                handleNavClose();
                window.location.reload();
              }}
            >
              Osvezi
            </button>
            <button
              className="button small ghost"
              type="button"
              onClick={() => {
                handleNavClose();
                void logout();
              }}
            >
              Odjava
            </button>
          </nav>
        </div>
      </header>

      <main className={`admin-shell${fullWidth ? " admin-shell--full" : " container"}`}>
        {!hideHeader && (
          <div className="admin-shell__header">
            <div className="admin-shell__title">
              <h1>{title}</h1>
              {subtitle ? <p>{subtitle}</p> : <p>Ulogovan: {admin.username} ({roleLabel})</p>}
            </div>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
