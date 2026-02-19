"use client";

import AdminShell from "@/components/srdjan/admin/AdminShell";

export default function OwnerTutorialPage() {
  return (
    <AdminShell
      title="Owner Tutorial"
      subtitle="Uputstvo za owner funkcije i upravljanje timom"
    >
      <div className="admin-card">
        <h3>1. Radnici i staff nalozi</h3>
        <p>
          Otvori <strong>Radnici</strong>. Tu dodajes nove radnike, menjas ime radnika,
          aktiviras/deaktiviras radnike i kreiras staff naloge vezane za radnika.
        </p>
      </div>

      <div className="admin-card">
        <h3>2. Promena imena i username-a</h3>
        <p>
          U kartici radnika prvo promeni <strong>ime radnika</strong>, zatim u kartici staff
          naloga promeni <strong>username</strong> i po potrebi lozinku.
        </p>
      </div>

      <div className="admin-card">
        <h3>3. Usluge po radniku</h3>
        <p>
          U sekciji <strong>Usluge</strong> owner moze menjati sve radnike, a staff menja samo
          svoje usluge (trajanje, cena, aktivnost, boja termina).
        </p>
      </div>

      <div className="admin-card">
        <h3>4. Kalendar i potvrde</h3>
        <p>
          Novi web termini dolaze kao <strong>pending</strong>. Staff ili owner ih potvrdi iz
          kalendara/termina pre finalne potvrde.
        </p>
      </div>

      <div className="admin-card">
        <h3>5. Limit radnika po lokaciji</h3>
        <p>
          Na stranici radnika se vidi odnos <strong>aktivno X / limit Y</strong>. Sistem ne dozvoljava
          aktivaciju preko limita lokacije.
        </p>
      </div>
    </AdminShell>
  );
}
