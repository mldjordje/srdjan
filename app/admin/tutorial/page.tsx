"use client";

import AdminShell from "@/components/srdjan/admin/AdminShell";

export default function AdminTutorialPage() {
  return (
    <AdminShell
      title="Staff Tutorial"
      subtitle="Prakticno uputstvo za radnike: od prijema zahteva do potvrde termina"
    >
      <div className="admin-card">
        <h3>1. Pocetak smene (1 minut)</h3>
        <p>
          Uloguj se na <strong>/admin</strong>, zatim otvori <strong>Staff</strong> i klikni svoje
          ime. Time ulazis direktno u svoj kalendar.
        </p>
      </div>

      <div className="admin-card">
        <h3>2. Novi online zahtevi (pending)</h3>
        <p>
          Novi web termini stizu kao <strong>pending</strong>. Klikni termin, proveri detalje
          i potvrdi ga dugmetom <strong>Potvrdjen</strong>. Ako klijent ne dodje, oznaci
          <strong> Nije dosao</strong>.
        </p>
      </div>

      <div className="admin-card">
        <h3>3. Termini preko telefona lokala</h3>
        <p>
          Ako klijent zove telefonom, mozes zakazati termin i u kalendaru drugog radnika.
          Klikni slobodan slot, unesi klijenta i uslugu, pa sacuvaj termin.
        </p>
      </div>

      <div className="admin-card">
        <h3>4. Blokada vremena</h3>
        <p>
          Za pauzu ili zauzece klikni slobodan slot, prebaci na <strong>Blokiraj</strong>,
          dodaj trajanje i razlog, pa sacuvaj.
        </p>
      </div>

      <div className="admin-card">
        <h3>5. Dnevna rutina koja sprecava greske</h3>
        <p>
          Na pocetku smene: proveri pending zahteve. Tokom dana: svaku promenu odmah upisi
          u kalendar. Na kraju smene: proveri sutrasnje termine i da li je sve potvrdeno.
        </p>
      </div>

      <div className="admin-card">
        <h3>6. Brzi podsetnik statusa</h3>
        <p>
          <strong>pending</strong> = ceka potvrdu, <strong>confirmed</strong> = potvrdjen,
          <strong> no_show</strong> = klijent nije dosao, <strong>cancelled</strong> = otkazan termin.
        </p>
      </div>

      <div className="admin-card">
        <h3>7. Unos smena za narednu nedelju</h3>
        <p>
          Smenu za narednu nedelju unosi owner/staff-admin za svakog radnika po danu:
          <strong> prepodne</strong>, <strong>popodne</strong> ili <strong>slobodan dan</strong>.
          Pravilo je da raspored za sledecu nedelju bude unet unapred, pre prvog termina.
        </p>
      </div>

      <div className="admin-card">
        <h3>8. Kada radi zamena smene sa kolegom</h3>
        <p>
          Zamena smene radi samo ako za taj datum oba radnika vec imaju dodeljenu smenu
          i nijedan od njih nema aktivne termine tog dana. Ako postoji makar jedan termin,
          prvo prebaci/otkazi termin pa tek onda uradi zamenu.
        </p>
      </div>
    </AdminShell>
  );
}
