import Image from "next/image";
import Link from "next/link";

import BookingForm from "@/components/BookingForm";
import { services } from "@/lib/services";
import { siteConfig } from "@/lib/site";

export default function Home() {
  const year = new Date().getFullYear();

  return (
    <div className="page">
      <header className="nav">
        <div className="container nav-inner">
          <div className="brand">
            <div className="brand-mark">
              <Image
                src="/logo.png"
                alt="Doctor Barber"
                width={36}
                height={36}
                priority
              />
            </div>
            <div className="brand-title">
              <span>Doctor Barber</span>
              <span>Barber Studio</span>
            </div>
          </div>
          <nav className="nav-links">
            <a href="#services">Usluge</a>
            <a href="#booking">Zakazivanje</a>
            <a href="#studio">Studio</a>
            <Link href="/login">Prijava</Link>
            <Link className="button small outline" href="/register">
              Registracija
            </Link>
            <Link className="button small ghost" href="/admin">
              CMS
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="orb one" aria-hidden="true" />
          <div className="orb two" aria-hidden="true" />
          <div className="container hero-grid">
            <div className="hero-copy">
              <span className="hero-tag">Doctor Barber Studio</span>
              <h1>Precizan fade, cista linija, bez improvizacije.</h1>
              <p>
                Studio fokusiran na detalj, higijenu i miran tempo. Rezervisi
                online, potvrdu saljemo brzo.
              </p>
              <div className="hero-actions">
                <a className="button" href="#booking">
                  Zakazi termin
                </a>
                <Link className="button outline" href="/register">
                  Registracija
                </Link>
              </div>
              <div className="hero-highlights">
                <div className="hero-highlight">
                  <span>Radno vreme</span>
                  <strong>{siteConfig.hours}</strong>
                </div>
                <div className="hero-highlight">
                  <span>Potvrda termina</span>
                  <strong>U roku od 24h</strong>
                </div>
                <div className="hero-highlight">
                  <span>Lokacija</span>
                  <strong>{siteConfig.city}</strong>
                </div>
              </div>
            </div>
            <div className="hero-visual">
              <div className="hero-image">
                <Image
                  src="/image.png"
                  alt="Doctor Barber studio"
                  fill
                  priority
                  sizes="(max-width: 900px) 100vw, 520px"
                />
              </div>
              <div className="hero-card">
                <strong>Sta dobijas</strong>
                <ul>
                  <li>Precizan fade i ciste linije bez zurbe.</li>
                  <li>Jasno vreme i cena pre nego sto pocnemo.</li>
                  <li>Higijena, sterilni alati i uredna postavka.</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section id="services" className="section">
          <div className="container">
            <div className="section-header">
              <h2>Usluge</h2>
              <p>
                Jasne cene, precizno trajanje i potpuna kontrola rezultata.
                Izaberi tretman koji ti najvise odgovara.
              </p>
            </div>
            <div className="services-grid">
              {services.map((service) => (
                <div key={service.id} className="service-card">
                  <h3>{service.name}</h3>
                  <div className="service-meta">
                    <span>{service.duration}</span>
                    <span className="price">
                      RSD {service.price.toLocaleString("sr-RS")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="booking" className="section">
          <div className="container">
            <div className="section-header">
              <h2>Zakazivanje</h2>
              <p>
                Popuni formu i posalji zahtev. Termin potvrdjujemo cim proverimo
                raspored.
              </p>
            </div>
            <div className="booking-grid">
              <BookingForm />
              <div className="info-grid">
                <div className="info-card">
                  <h4>Potvrda termina</h4>
                  <p>
                    Javljamo potvrdu SMS-om ili pozivom. Ako termin nije slobodan,
                    predlazemo sledeci najblizi.
                  </p>
                </div>
                <div className="info-card">
                  <h4>Priprema</h4>
                  <p>
                    Dodji 5 minuta ranije. Raspored je precizan, bez guzve i bez
                    cekanja.
                  </p>
                </div>
                <div className="info-card">
                  <h4>Politika otkazivanja</h4>
                  <p>
                    Ako moras da otkazes, javi bar 6 sati ranije da oslobodimo
                    termin.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="studio" className="section">
          <div className="container">
            <div className="section-header">
              <h2>Studio</h2>
              <p>
                Mirna atmosfera, ogranicen broj termina dnevno i potpuna paznja
                na detalj.
              </p>
            </div>
            <div className="info-grid">
              <div className="info-card">
                <h4>Radno vreme</h4>
                <p>{siteConfig.hours}</p>
              </div>
              <div className="info-card">
                <h4>Lokacija</h4>
                <p>{siteConfig.locationNote}</p>
              </div>
              <div className="info-card">
                <h4>Kontakt</h4>
                <p>
                  {siteConfig.phone && <span>{siteConfig.phone}</span>}
                  {siteConfig.email && (
                    <span>
                      {siteConfig.phone ? " | " : ""}
                      {siteConfig.email}
                    </span>
                  )}
                  {!siteConfig.phone && !siteConfig.email && (
                    <span>Kontakt podaci se dodaju nakon aktivacije domena.</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container">
          <p>Doctor Barber | {year}</p>
        </div>
      </footer>
    </div>
  );
}
