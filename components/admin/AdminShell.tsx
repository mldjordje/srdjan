"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";

type AdminShellProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  hideHeader?: boolean;
  fullWidth?: boolean;
};

const navItems = [
  { href: "/admin/termini", label: "Termini" },
  { href: "/admin/calendar", label: "Kalendar" },
  { href: "/admin/clients", label: "Klijenti" },
  { href: "/admin/usluge", label: "Usluge" },
  { href: "/admin/notifications", label: "Notifikacije", badge: true },
];

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";
const adminKey = process.env.NEXT_PUBLIC_ADMIN_KEY || "";

export default function AdminShell({
  title,
  subtitle,
  children,
  hideHeader = false,
  fullWidth = false,
}: AdminShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [isNavOpen, setIsNavOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("db_admin_auth");
    if (stored === "true") {
      setReady(true);
      return;
    }

    router.replace("/admin");
  }, [router]);

  useEffect(() => {
    setIsNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!ready || !apiBaseUrl || !adminKey) {
      return;
    }

    let active = true;
    fetch(`${apiBaseUrl}/notifications.php?unreadOnly=1&includeUnreadCount=1&limit=1`, {
      headers: {
        "X-Admin-Key": adminKey,
      },
    })
      .then((response) => response.json())
      .then((data) => {
        if (!active) {
          return;
        }
        const count = Number(data?.unreadCount ?? data?.notifications?.length ?? 0);
        setNotificationCount(Number.isFinite(count) ? count : 0);
      })
      .catch(() => {
        if (active) {
          setNotificationCount(0);
        }
      });

    return () => {
      active = false;
    };
  }, [ready]);

  const handleLogout = () => {
    setIsNavOpen(false);
    localStorage.removeItem("db_admin_auth");
    router.replace("/admin");
  };

  const handleRefresh = () => {
    setIsNavOpen(false);
    window.location.reload();
  };

  const handleNavToggle = () => setIsNavOpen((prev) => !prev);
  const handleNavClose = () => setIsNavOpen(false);

  if (!ready) {
    return null;
  }

  return (
    <div className="page">
      <header className={`nav nav--has-toggle nav--dropdown${isNavOpen ? " is-open" : ""}`}>
        <div className="container nav-inner">
          <div className="nav-top">
            <Link className="brand" href="/">
              <div className="brand-mark">
                <Image
                  src="/logo.png"
                  alt="Doctor Barber"
                  width={36}
                  height={36}
                />
              </div>
              <div className="brand-title">
                <span>Doctor Barber</span>
                <span>CMS Panel</span>
              </div>
            </Link>
            <button
              className="nav-toggle"
              type="button"
              aria-expanded={isNavOpen}
              aria-controls="admin-navigation"
              onClick={handleNavToggle}
            >
              <span className="nav-toggle__label">Meni</span>
              <span className="nav-toggle__icon" aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
            </button>
          </div>
          <nav
            id="admin-navigation"
            className={`nav-links${isNavOpen ? " is-open" : ""}`}
          >
            <Link href="/" onClick={handleNavClose}>
              Pocetna
            </Link>
            <Link href="/#booking" onClick={handleNavClose}>
              Zakazi termin
            </Link>
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href === "/admin/termini" && pathname === "/admin/appointments");
              const showBadge = item.badge && notificationCount > 0;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleNavClose}
                  className={`admin-link ${isActive ? "is-active" : ""}`}
                >
                  <span>{item.label}</span>
                  {showBadge && <span className="nav-badge">{notificationCount}</span>}
                </Link>
              );
            })}
            <button className="button small ghost" type="button" onClick={handleRefresh}>
              Osvezi
            </button>
            <button className="button small ghost" type="button" onClick={handleLogout}>
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
              {subtitle && <p>{subtitle}</p>}
            </div>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
