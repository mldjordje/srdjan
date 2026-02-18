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
  children: React.ReactNode;
};

const navItems = [
  { href: "/admin/dashboard", label: "Dashboard", ownerOnly: true },
  { href: "/admin/zarada", label: "Zarada", ownerOnly: true },
  { href: "/admin/calendar", label: "Kalendar", ownerOnly: false },
  { href: "/admin/usluge", label: "Usluge", ownerOnly: false },
  { href: "/admin/clients", label: "Klijenti", ownerOnly: false },
  { href: "/admin/termini", label: "Termini", ownerOnly: false },
  { href: "/admin/notifications", label: "Notifikacije", ownerOnly: false },
  { href: "/admin/settings", label: "Podesavanja", ownerOnly: true },
];

export default function AdminShell({ title, children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  const logout = async () => {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    router.push("/admin");
  };

  if (loading) {
    return <main className="container"><p>Ucitavanje admin panela...</p></main>;
  }

  if (!admin) {
    return (
      <main className="container" style={{ paddingTop: 24 }}>
        <h1>Admin</h1>
        <p className="form-status error">{error || "Niste prijavljeni."}</p>
        <Link className="button" href="/admin">Idi na prijavu</Link>
      </main>
    );
  }

  return (
    <main className="container" style={{ paddingTop: 24, paddingBottom: 48 }}>
      <header className="admin-card">
        <div className="admin-toolbar">
          <div>
            <h1>{title}</h1>
            <p>Ulogovan: {admin.username} ({admin.role})</p>
          </div>
          <button className="button outline" onClick={logout}>Odjava</button>
        </div>
        <nav className="admin-actions">
          {navItems
            .filter((item) => (item.ownerOnly ? admin.role === "owner" : true))
            .map((item) => (
              <Link
                key={item.href}
                className={`button outline ${pathname === item.href ? "is-active" : ""}`}
                href={item.href}
              >
                {item.label}
              </Link>
            ))}
        </nav>
      </header>
      {children}
    </main>
  );
}
