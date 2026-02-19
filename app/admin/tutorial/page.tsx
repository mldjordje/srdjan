"use client";

import AdminShell from "@/components/srdjan/admin/AdminShell";

export default function AdminTutorialPage() {
  return (
    <AdminShell
      title="Staff Tutorial"
      subtitle="Kratko uputstvo za svakodnevno koriscenje aplikacije"
    >
      <div className="admin-card">
        <h3>1. Izbor radnika</h3>
        <p>
          Otvori <strong>Staff</strong> pa klikni na Anu, Denisa, Marka ili drugog radnika.
          Time odmah ulazis u njegov kalendar.
        </p>
      </div>

      <div className="admin-card">
        <h3>2. Dodavanje termina</h3>
        <p>
          U kalendaru klikni prazno polje. Otvara se modal gde unosis klijenta, uslugu i vreme.
          Snimi termin na dugme <strong>Sacuvaj termin</strong>.
        </p>
      </div>

      <div className="admin-card">
        <h3>3. Blokada vremena</h3>
        <p>
          Klikni prazno polje, prebaci tab na <strong>Blokiraj</strong>, unesi trajanje i razlog,
          pa sacuvaj blokadu.
        </p>
      </div>

      <div className="admin-card">
        <h3>4. Status termina</h3>
        <p>
          Klik na postojeci termin otvara detalje. Tu mozes da potvrdis dolazak, oznacis
          <strong> no_show</strong> ili obrises termin.
        </p>
      </div>

      <div className="admin-card">
        <h3>5. Usluge</h3>
        <p>
          U sekciji <strong>Usluge</strong> dodaj novu uslugu za izabranog radnika. Preporucene
          vremenske opcije su <strong>20, 40 i 60 min</strong>.
        </p>
      </div>
    </AdminShell>
  );
}

