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
];

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

  useEffect(() => {
    const stored = localStorage.getItem("db_admin_auth");
    if (stored === "true") {
      setReady(true);
      return;
    }

    router.replace("/admin");
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("db_admin_auth");
    router.replace("/admin");
  };

  if (!ready) {
    return null;
  }

  return (
    <div className="page">
      <header className="nav">
        <div className="container nav-inner">
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
          <nav className="nav-links">
            <Link href="/">Pocetna</Link>
            <Link href="/#booking">Zakazi termin</Link>
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href === "/admin/termini" && pathname === "/admin/appointments");

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`admin-link ${isActive ? "is-active" : ""}`}
                >
                  {item.label}
                </Link>
              );
            })}
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
