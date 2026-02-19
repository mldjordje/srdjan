"use client";

import { useEffect, useMemo, useState } from "react";

import AdminShell from "@/components/srdjan/admin/AdminShell";

type AdminMe = {
  id: string;
  username: string;
  role: "owner" | "staff-admin";
};

type Worker = {
  id: string;
  location_id: string;
  name: string;
  is_active: boolean;
};

type Location = {
  id: string;
  name: string;
  is_active: boolean;
  max_active_workers: number;
};

type LocationStat = {
  locationId: string;
  activeWorkers: number;
  maxActiveWorkers: number;
};

type StaffUser = {
  id: string;
  username: string;
  role: "staff-admin";
  is_active: boolean;
  worker_id: string;
  workers?: { id: string; name: string; location_id: string } | null;
};

export default function AdminWorkersPage() {
  const [admin, setAdmin] = useState<AdminMe | null>(null);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationStats, setLocationStats] = useState<LocationStat[]>([]);
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  const [workerForm, setWorkerForm] = useState({
    locationId: "",
    name: "",
    isActive: true,
  });
  const [staffForm, setStaffForm] = useState({
    workerId: "",
    username: "",
    password: "",
  });
  const [resetPasswords, setResetPasswords] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    setStatus("");
    const [meRes, workersRes, staffRes] = await Promise.all([
      fetch("/api/admin/me"),
      fetch("/api/admin/workers?includeInactive=1&includeLocations=1"),
      fetch("/api/admin/staff-users"),
    ]);

    const meData = await meRes.json();
    if (!meRes.ok) {
      throw new Error(meData.error || "Niste prijavljeni.");
    }
    setAdmin(meData);
    if (meData.role !== "owner") {
      setLoading(false);
      return;
    }

    const workersData = await workersRes.json();
    if (!workersRes.ok) {
      throw new Error(workersData.error || "Ne mogu da ucitam radnike.");
    }
    const listWorkers = Array.isArray(workersData.workers) ? workersData.workers : [];
    const listLocations = Array.isArray(workersData.locations) ? workersData.locations : [];
    const listStats = Array.isArray(workersData.locationStats) ? workersData.locationStats : [];
    setWorkers(listWorkers);
    setLocations(listLocations);
    setLocationStats(listStats);
    setWorkerForm((prev) => ({
      ...prev,
      locationId: prev.locationId || listLocations[0]?.id || "",
    }));

    const staffData = await staffRes.json();
    if (!staffRes.ok) {
      throw new Error(staffData.error || "Ne mogu da ucitam staff naloge.");
    }
    setStaffUsers(Array.isArray(staffData.staffUsers) ? staffData.staffUsers : []);
    setLoading(false);
  };

  useEffect(() => {
    load().catch((error) => {
      setStatus(error instanceof Error ? error.message : "Greska.");
      setLoading(false);
    });
  }, []);

  const workersWithoutAccount = useMemo(() => {
    const assigned = new Set(staffUsers.map((item) => item.worker_id));
    return workers.filter((worker) => !assigned.has(worker.id));
  }, [staffUsers, workers]);

  const createWorker = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus("");
    const response = await fetch("/api/admin/workers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(workerForm),
    });
    const data = await response.json();
    if (!response.ok) {
      setStatus(data.error || "Ne mogu da kreiram radnika.");
      return;
    }
    setWorkerForm((prev) => ({ ...prev, name: "" }));
    await load();
    setStatus("Radnik je sacuvan.");
  };

  const toggleWorkerActive = async (worker: Worker) => {
    setStatus("");
    const response = await fetch("/api/admin/workers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: worker.id,
        isActive: !worker.is_active,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setStatus(data.error || "Ne mogu da promenim status radnika.");
      return;
    }
    await load();
    setStatus("Status radnika je azuriran.");
  };

  const createStaffUser = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus("");
    const response = await fetch("/api/admin/staff-users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(staffForm),
    });
    const data = await response.json();
    if (!response.ok) {
      setStatus(data.error || "Ne mogu da kreiram staff nalog.");
      return;
    }
    setStaffForm({ workerId: "", username: "", password: "" });
    await load();
    setStatus("Staff nalog je kreiran.");
  };

  const toggleStaffActive = async (item: StaffUser) => {
    const response = await fetch("/api/admin/staff-users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: item.id,
        isActive: !item.is_active,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setStatus(data.error || "Ne mogu da promenim status staff naloga.");
      return;
    }
    await load();
    setStatus("Staff nalog je azuriran.");
  };

  const resetStaffPassword = async (item: StaffUser) => {
    const nextPassword = (resetPasswords[item.id] || "").trim();
    if (!nextPassword) {
      setStatus("Unesi novu lozinku.");
      return;
    }
    const response = await fetch("/api/admin/staff-users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: item.id,
        password: nextPassword,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setStatus(data.error || "Ne mogu da resetujem lozinku.");
      return;
    }
    setResetPasswords((prev) => ({ ...prev, [item.id]: "" }));
    setStatus("Lozinka je resetovana.");
  };

  if (loading) {
    return (
      <AdminShell title="Radnici" subtitle="Ucitavanje...">
        <p>Ucitavanje...</p>
      </AdminShell>
    );
  }

  if (admin?.role !== "owner") {
    return (
      <AdminShell title="Radnici" subtitle="Samo owner ima pristup ovoj stranici.">
        <p className="form-status error">Nemate dozvolu.</p>
      </AdminShell>
    );
  }

  return (
    <AdminShell title="Radnici" subtitle="Owner upravljanje radnicima i staff nalozima">
      <div className="admin-card">
        <h3>Limit po lokaciji</h3>
        {locationStats.map((stat) => {
          const location = locations.find((item) => item.id === stat.locationId);
          return (
            <div key={stat.locationId} className="dashboard-list-item">
              <div>
                <strong>{location?.name || stat.locationId}</strong>
                <span>
                  Aktivno {stat.activeWorkers} / {stat.maxActiveWorkers}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="admin-card">
        <h3>Dodaj radnika</h3>
        <form className="form-grid" onSubmit={createWorker}>
          <div className="form-row">
            <label>Lokacija</label>
            <select
              className="select"
              value={workerForm.locationId}
              onChange={(event) =>
                setWorkerForm((prev) => ({ ...prev, locationId: event.target.value }))
              }
              required
            >
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <label>Ime radnika</label>
            <input
              className="input"
              value={workerForm.name}
              onChange={(event) =>
                setWorkerForm((prev) => ({ ...prev, name: event.target.value }))
              }
              required
            />
          </div>
          <div className="form-row">
            <button className="button" type="submit">
              Dodaj radnika
            </button>
          </div>
        </form>
      </div>

      <div className="admin-card">
        <h3>Radnici ({workers.length})</h3>
        {workers.map((worker) => (
          <div key={worker.id} className="admin-card">
            <strong>{worker.name}</strong>
            <div>
              Lokacija: {locations.find((item) => item.id === worker.location_id)?.name || worker.location_id}
            </div>
            <div>Status: {worker.is_active ? "Aktivan" : "Neaktivan"}</div>
            <button
              className="button outline"
              type="button"
              onClick={() => toggleWorkerActive(worker)}
            >
              {worker.is_active ? "Deaktiviraj" : "Aktiviraj"}
            </button>
          </div>
        ))}
      </div>

      <div className="admin-card">
        <h3>Kreiraj staff nalog za radnika</h3>
        <form className="form-grid" onSubmit={createStaffUser}>
          <div className="form-row">
            <label>Radnik</label>
            <select
              className="select"
              value={staffForm.workerId}
              onChange={(event) =>
                setStaffForm((prev) => ({ ...prev, workerId: event.target.value }))
              }
              required
            >
              <option value="">Izaberi radnika</option>
              {workersWithoutAccount.map((worker) => (
                <option key={worker.id} value={worker.id}>
                  {worker.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <label>Username</label>
            <input
              className="input"
              value={staffForm.username}
              onChange={(event) =>
                setStaffForm((prev) => ({ ...prev, username: event.target.value }))
              }
              required
            />
          </div>
          <div className="form-row">
            <label>Lozinka</label>
            <input
              className="input"
              type="password"
              value={staffForm.password}
              onChange={(event) =>
                setStaffForm((prev) => ({ ...prev, password: event.target.value }))
              }
              required
            />
          </div>
          <div className="form-row">
            <button className="button" type="submit">
              Kreiraj staff nalog
            </button>
          </div>
        </form>
      </div>

      <div className="admin-card">
        <h3>Staff nalozi ({staffUsers.length})</h3>
        {staffUsers.map((item) => (
          <div key={item.id} className="admin-card">
            <strong>{item.username}</strong>
            <div>Radnik: {item.workers?.name || item.worker_id}</div>
            <div>Status: {item.is_active ? "Aktivan" : "Neaktivan"}</div>
            <div className="form-row">
              <label>Nova lozinka</label>
              <input
                className="input"
                type="password"
                value={resetPasswords[item.id] || ""}
                onChange={(event) =>
                  setResetPasswords((prev) => ({ ...prev, [item.id]: event.target.value }))
                }
              />
            </div>
            <div className="admin-actions">
              <button className="button outline" type="button" onClick={() => toggleStaffActive(item)}>
                {item.is_active ? "Deaktiviraj" : "Aktiviraj"}
              </button>
              <button className="button outline" type="button" onClick={() => resetStaffPassword(item)}>
                Sacuvaj novu lozinku
              </button>
            </div>
          </div>
        ))}
      </div>

      {status && <p className="form-status success">{status}</p>}
    </AdminShell>
  );
}

