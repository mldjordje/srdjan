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
          Otvori <strong>Smene</strong>, izaberi ponedeljak naredne nedelje i proveri da je za svakog
          radnika upisano: <strong>prepodne</strong>, <strong>popodne</strong> ili
          <strong> slobodan dan</strong>. Raspored mora biti unet unapred, pre prvog termina.
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

      <div className="admin-card">
        <h3>9. Kako tumaciti dostupnost termina</h3>
        <p>
          Ako ne vidis slobodne slotove, proveri redom: 1) da li radnik ima smenu tog dana,
          2) da li je radno vreme lokala pravilno podeseno i 3) da li postoji blokada vremena
          u kalendaru.
        </p>
      </div>

      <div className="admin-card">
        <h3>10. Tekst za stampu u salonu: instalacija klijentske aplikacije</h3>
        <p>
          <strong>INSTALIRAJ APLIKACIJU SALON SRDJAN</strong>
          <br />
          Zakazivanje je brze preko aplikacije. Instalacija traje 10 sekundi.
        </p>
        <p>
          <strong>ANDROID</strong>
          <br />
          1) Otvori sajt salona.
          <br />
          2) Klikni dugme <strong>Install app</strong>.
          <br />
          3) Potvrdi instalaciju.
          <br />
          4) Ikonica aplikacije ce se pojaviti na telefonu.
        </p>
        <p>
          <strong>IPHONE (iOS)</strong>
          <br />
          1) Otvori sajt u Safari browser-u.
          <br />
          2) Klikni <strong>Share</strong> (kvadrat sa strelicom nagore).
          <br />
          3) Izaberi <strong>Add to Home Screen</strong>.
          <br />
          4) Klikni <strong>Add</strong>.
          <br />
          5) Ikonica aplikacije ce biti na pocetnom ekranu.
        </p>
      </div>
    </AdminShell>
  );
}
