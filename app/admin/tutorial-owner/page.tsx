"use client";

import AdminShell from "@/components/srdjan/admin/AdminShell";

export default function OwnerTutorialPage() {
  return (
    <AdminShell
      title="Owner Tutorial"
      subtitle="Operativno uputstvo za ownera: setup tima, obavestenja i kontrola rada"
    >
      <div className="admin-card">
        <h3>1. Setup radnika i naloga</h3>
        <p>
          Na strani <strong>Radnici</strong> dodajes radnika, cuvas ime, aktiviras/deaktiviras
          i kreiras staff nalog vezan za tog radnika.
        </p>
      </div>

      <div className="admin-card">
        <h3>2. Email obavestenja po radniku</h3>
        <p>
          Za svakog radnika postavi <strong>Email za obavestenja</strong>. Kada stigne novi
          online termin, taj radnik dobija email sa detaljima i linkom ka admin kalendaru
          gde treba da potvrdi termin.
        </p>
      </div>

      <div className="admin-card">
        <h3>3. Kontrola usluga po radniku</h3>
        <p>
          U sekciji <strong>Usluge</strong> owner kontrolise trajanje, cenu i aktivnost usluga
          za svakog radnika. Ovo direktno utice na slobodne termine u bookingu.
        </p>
      </div>

      <div className="admin-card">
        <h3>4. Pravila za pending termine</h3>
        <p>
          Novi web termini su <strong>pending</strong> dok ih staff/owner ne potvrdi.
          Dogovor u timu: pending ne sme da ostane neobradjen duze od nekoliko minuta.
        </p>
      </div>

      <div className="admin-card">
        <h3>5. Delegiranje i zamene</h3>
        <p>
          Ako jedan radnik nije prisutan, drugi staff moze otvoriti njegov kalendar i zakazati
          termin za klijenta koji je zvao lokal. Time se ne gubi nijedan poziv.
        </p>
      </div>

      <div className="admin-card">
        <h3>6. Dnevni owner checklist</h3>
        <p>
          1) Proveri da svaki aktivan radnik ima email za obavestenja. 2) Proveri da nema
          zaostalih pending termina. 3) Proveri raspored i eventualne blokade za naredni dan.
        </p>
      </div>

      <div className="admin-card">
        <h3>7. Tehnicki preduslovi za email notifikacije</h3>
        <p>
          U deploy okruzenju postavi: <strong>RESEND_API_KEY</strong>, <strong>EMAIL_FROM</strong>
          i pozeljno <strong>APP_PUBLIC_URL</strong>. Bez ovoga booking radi, ali mail obavestenja
          se ne salju.
        </p>
      </div>
    </AdminShell>
  );
}
