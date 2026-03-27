"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";

import WorkerAvatar from "@/components/admin/WorkerAvatar";
import WorkerPicker, { type WorkerPickerOption } from "@/components/admin/WorkerPicker";
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
  notification_email?: string | null;
  profile_image_url?: string | null;
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
  workers?: { id: string; name: string; location_id: string; profile_image_url?: string | null } | null;
};

type AvatarDraft = {
  file: File;
  previewUrl: string;
};

const normalizeUsername = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 24);

export default function AdminWorkersPage() {
  const [admin, setAdmin] = useState<AdminMe | null>(null);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationStats, setLocationStats] = useState<LocationStat[]>([]);
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [workerNames, setWorkerNames] = useState<Record<string, string>>({});
  const [workerNotificationEmails, setWorkerNotificationEmails] = useState<Record<string, string>>(
    {}
  );
  const [staffUsernames, setStaffUsernames] = useState<Record<string, string>>({});
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploadingWorkerId, setUploadingWorkerId] = useState("");
  const [removingWorkerId, setRemovingWorkerId] = useState("");
  const [avatarDrafts, setAvatarDrafts] = useState<Record<string, AvatarDraft>>({});

  const [workerForm, setWorkerForm] = useState({
    locationId: "",
    name: "",
    isActive: true,
    notificationEmail: "",
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
      fetch("/api/admin/me", {
        cache: "no-store",
        credentials: "include",
      }),
      fetch("/api/admin/workers?includeInactive=1&includeLocations=1", {
        cache: "no-store",
        credentials: "include",
      }),
      fetch("/api/admin/staff-users", {
        cache: "no-store",
        credentials: "include",
      }),
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
    setWorkerNames(
      listWorkers.reduce((acc: Record<string, string>, worker: Worker) => {
        acc[worker.id] = worker.name;
        return acc;
      }, {})
    );
    setWorkerNotificationEmails(
      listWorkers.reduce((acc: Record<string, string>, worker: Worker) => {
        acc[worker.id] = worker.notification_email || "";
        return acc;
      }, {})
    );
    setWorkerForm((prev) => ({
      ...prev,
      locationId: prev.locationId || listLocations[0]?.id || "",
    }));

    const staffData = await staffRes.json();
    if (!staffRes.ok) {
      throw new Error(staffData.error || "Ne mogu da ucitam staff naloge.");
    }
    const nextStaffUsers = Array.isArray(staffData.staffUsers) ? staffData.staffUsers : [];
    setStaffUsers(nextStaffUsers);
    setStaffUsernames(
      nextStaffUsers.reduce((acc: Record<string, string>, item: StaffUser) => {
        acc[item.id] = item.username;
        return acc;
      }, {})
    );
    setLoading(false);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      load().catch((error) => {
        setStatus(error instanceof Error ? error.message : "Greska.");
        setLoading(false);
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    return () => {
      Object.values(avatarDrafts).forEach((draft) => {
        URL.revokeObjectURL(draft.previewUrl);
      });
    };
  }, [avatarDrafts]);

  const workersWithoutAccount = useMemo(() => {
    const assigned = new Set(staffUsers.map((item) => item.worker_id));
    return workers.filter((worker) => !assigned.has(worker.id));
  }, [staffUsers, workers]);

  const locationNameById = useMemo(
    () =>
      locations.reduce((acc: Record<string, string>, location) => {
        acc[location.id] = location.name;
        return acc;
      }, {}),
    [locations]
  );

  const staffWorkerOptions = useMemo<WorkerPickerOption[]>(
    () =>
      workersWithoutAccount.map((worker) => ({
        id: worker.id,
        name: worker.name,
        profile_image_url: worker.profile_image_url,
        subtitle: locationNameById[worker.location_id] || "Bez lokacije",
      })),
    [locationNameById, workersWithoutAccount]
  );

  const createWorker = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus("");
    const response = await fetch("/api/admin/workers", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(workerForm),
    });
    const data = await response.json();
    if (!response.ok) {
      setStatus(data.error || "Ne mogu da kreiram radnika.");
      return;
    }
    setWorkerForm((prev) => ({ ...prev, name: "", notificationEmail: "" }));
    await load();
    setStatus("Radnik je sacuvan.");
  };

  const toggleWorkerActive = async (worker: Worker) => {
    setStatus("");
    const response = await fetch("/api/admin/workers", {
      method: "PATCH",
      credentials: "include",
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

  const saveWorkerName = async (worker: Worker) => {
    setStatus("");
    const nextName = (workerNames[worker.id] || "").trim();
    if (!nextName) {
      setStatus("Ime radnika je obavezno.");
      return;
    }
    const response = await fetch("/api/admin/workers", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: worker.id,
        name: nextName,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setStatus(data.error || "Ne mogu da sacuvam ime radnika.");
      return;
    }
    await load();
    setStatus("Ime radnika je azurirano.");
  };

  const saveWorkerNotificationEmail = async (worker: Worker) => {
    setStatus("");
    const nextNotificationEmail = (workerNotificationEmails[worker.id] || "").trim();
    const response = await fetch("/api/admin/workers", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: worker.id,
        notificationEmail: nextNotificationEmail,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setStatus(data.error || "Ne mogu da sacuvam email za obavestenja.");
      return;
    }
    await load();
    setStatus("Email za obavestenja je azuriran.");
  };

  const createStaffUser = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus("");
    const response = await fetch("/api/admin/staff-users", {
      method: "POST",
      credentials: "include",
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

  const handleAvatarFileChange = (worker: Worker, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setAvatarDrafts((prev) => {
      const currentDraft = prev[worker.id];
      if (currentDraft) {
        URL.revokeObjectURL(currentDraft.previewUrl);
      }
      return {
        ...prev,
        [worker.id]: {
          file,
          previewUrl: URL.createObjectURL(file),
        },
      };
    });
    setStatus("");
    event.target.value = "";
  };

  const clearAvatarDraft = (workerId: string) => {
    setAvatarDrafts((prev) => {
      const currentDraft = prev[workerId];
      if (currentDraft) {
        URL.revokeObjectURL(currentDraft.previewUrl);
      }
      const next = { ...prev };
      delete next[workerId];
      return next;
    });
  };

  const uploadWorkerAvatar = async (worker: Worker) => {
    const draft = avatarDrafts[worker.id];
    if (!draft) {
      setStatus("Prvo izaberi fajl za profilnu sliku.");
      return;
    }

    setUploadingWorkerId(worker.id);
    setStatus("");
    try {
      const body = new FormData();
      body.append("file", draft.file);
      const response = await fetch(`/api/admin/workers/${encodeURIComponent(worker.id)}/avatar`, {
        method: "POST",
        credentials: "include",
        body,
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Ne mogu da uploadujem profilnu sliku.");
      }
      clearAvatarDraft(worker.id);
      await load();
      setStatus("Profilna slika radnika je sacuvana.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Greska pri uploadu slike.");
    } finally {
      setUploadingWorkerId("");
    }
  };

  const removeWorkerAvatar = async (worker: Worker) => {
    setRemovingWorkerId(worker.id);
    setStatus("");
    try {
      const response = await fetch(`/api/admin/workers/${encodeURIComponent(worker.id)}/avatar`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Ne mogu da obrisem profilnu sliku.");
      }
      clearAvatarDraft(worker.id);
      await load();
      setStatus("Profilna slika radnika je obrisana.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Greska pri brisanju slike.");
    } finally {
      setRemovingWorkerId("");
    }
  };

  const toggleStaffActive = async (item: StaffUser) => {
    setStatus("");
    const response = await fetch("/api/admin/staff-users", {
      method: "PATCH",
      credentials: "include",
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

  const saveStaffUsername = async (item: StaffUser) => {
    setStatus("");
    const nextUsername = (staffUsernames[item.id] || "").trim();
    if (!nextUsername) {
      setStatus("Username je obavezan.");
      return;
    }
    const response = await fetch("/api/admin/staff-users", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: item.id,
        username: nextUsername,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setStatus(data.error || "Ne mogu da sacuvam username.");
      return;
    }
    await load();
    setStatus("Username je azuriran.");
  };

  const resetStaffPassword = async (item: StaffUser) => {
    setStatus("");
    const nextPassword = (resetPasswords[item.id] || "").trim();
    if (!nextPassword) {
      setStatus("Unesi novu lozinku.");
      return;
    }
    const response = await fetch("/api/admin/staff-users", {
      method: "PATCH",
      credentials: "include",
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
            <label>Email za obavestenja (opciono)</label>
            <input
              className="input"
              type="email"
              value={workerForm.notificationEmail}
              onChange={(event) =>
                setWorkerForm((prev) => ({
                  ...prev,
                  notificationEmail: event.target.value,
                }))
              }
              placeholder="radnik@email.com"
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
            {(() => {
              const draft = avatarDrafts[worker.id];
              const avatarImage = draft?.previewUrl || worker.profile_image_url;
              return (
                <>
            <div className="worker-card__header">
              <div className="worker-card__identity">
                <WorkerAvatar name={worker.name} imageUrl={avatarImage} size="lg" />
                <div className="worker-card__meta">
                  <strong>{worker.name}</strong>
                  <span>
                    Lokacija: {locationNameById[worker.location_id] || worker.location_id}
                  </span>
                </div>
              </div>
              <div className={`status-pill ${worker.is_active ? "confirmed" : "cancelled"}`}>
                {worker.is_active ? "Aktivan" : "Neaktivan"}
              </div>
            </div>
            <div>Status: {worker.is_active ? "Aktivan" : "Neaktivan"}</div>
            <div>Email za obavestenja: {worker.notification_email || "-"}</div>
            <div className="form-row">
              <label>Profilna slika</label>
              <div className="worker-card__upload">
                <input
                  className="input"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(event) => handleAvatarFileChange(worker, event)}
                  disabled={uploadingWorkerId === worker.id}
                />
                <button
                  className="button outline small"
                  type="button"
                  onClick={() => uploadWorkerAvatar(worker)}
                  disabled={!draft || uploadingWorkerId === worker.id}
                >
                  {uploadingWorkerId === worker.id ? "Cuvanje..." : "Sacuvaj sliku"}
                </button>
                {draft && (
                  <button
                    className="button outline small"
                    type="button"
                    onClick={() => clearAvatarDraft(worker.id)}
                    disabled={uploadingWorkerId === worker.id}
                  >
                    Otkazi izbor
                  </button>
                )}
                {(worker.profile_image_url || draft) && (
                  <button
                    className="button outline small"
                    type="button"
                    onClick={() => removeWorkerAvatar(worker)}
                    disabled={removingWorkerId === worker.id}
                  >
                    {removingWorkerId === worker.id ? "Brisanje..." : "Obrisi sliku"}
                  </button>
                )}
              </div>
              {draft ? (
                <small>Spremno za cuvanje: {draft.file.name}</small>
              ) : (
                <small>JPG, PNG ili WEBP do 2 MB.</small>
              )}
            </div>
            <div className="form-row">
              <label>Ime radnika</label>
              <input
                className="input"
                value={workerNames[worker.id] || ""}
                onChange={(event) =>
                  setWorkerNames((prev) => ({ ...prev, [worker.id]: event.target.value }))
                }
              />
            </div>
            <div className="form-row">
              <label>Email za obavestenja</label>
              <input
                className="input"
                type="email"
                value={workerNotificationEmails[worker.id] || ""}
                onChange={(event) =>
                  setWorkerNotificationEmails((prev) => ({
                    ...prev,
                    [worker.id]: event.target.value,
                  }))
                }
                placeholder="radnik@email.com"
              />
            </div>
            <div className="admin-actions">
              <button className="button outline" type="button" onClick={() => saveWorkerName(worker)}>
                Sacuvaj ime
              </button>
              <button
                className="button outline"
                type="button"
                onClick={() => saveWorkerNotificationEmail(worker)}
              >
                Sacuvaj email
              </button>
              <button className="button outline" type="button" onClick={() => toggleWorkerActive(worker)}>
                {worker.is_active ? "Deaktiviraj" : "Aktiviraj"}
              </button>
            </div>
                </>
              );
            })()}
          </div>
        ))}
      </div>

      <div className="admin-card">
        <h3>Kreiraj staff nalog za radnika</h3>
        <form className="form-grid" onSubmit={createStaffUser}>
          <div className="form-row">
            <label>Radnik</label>
            <WorkerPicker
              workers={staffWorkerOptions}
              value={staffForm.workerId}
              onChange={(selectedWorkerId) => {
                const selectedWorker = workersWithoutAccount.find(
                  (worker) => worker.id === selectedWorkerId
                );
                setStaffForm((prev) => ({
                  ...prev,
                  workerId: selectedWorkerId,
                  username: prev.username.trim() || normalizeUsername(selectedWorker?.name || ""),
                }));
              }}
              placeholder="Izaberi radnika"
              searchPlaceholder="Pretrazi radnika"
              emptyLabel="Svi radnici vec imaju staff nalog."
            />
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
            <div className="worker-card__header">
              <div className="worker-card__identity">
                <WorkerAvatar
                  name={item.workers?.name || item.username}
                  imageUrl={item.workers?.profile_image_url}
                  size="md"
                />
                <div className="worker-card__meta">
                  <strong>{item.username}</strong>
                  <span>Radnik: {item.workers?.name || item.worker_id}</span>
                </div>
              </div>
              <div className={`status-pill ${item.is_active ? "confirmed" : "cancelled"}`}>
                {item.is_active ? "Aktivan" : "Neaktivan"}
              </div>
            </div>
            <div>Status: {item.is_active ? "Aktivan" : "Neaktivan"}</div>
            <div className="form-row">
              <label>Username</label>
              <input
                className="input"
                value={staffUsernames[item.id] || ""}
                onChange={(event) =>
                  setStaffUsernames((prev) => ({ ...prev, [item.id]: event.target.value }))
                }
              />
            </div>
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
              <button className="button outline" type="button" onClick={() => saveStaffUsername(item)}>
                Sacuvaj username
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
