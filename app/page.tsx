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
        <section className="hero reveal-on-scroll" data-reveal="stagger">
          <div className="orb one" aria-hidden="true" />
          <div className="orb two" aria-hidden="true" />
          <div className="container hero-grid">
            <div className="hero-copy">
              <span className="hero-tag">Doctor Barber Studio</span>
              <h1>Precizan fade, cista linija, bez improvizacije.</h1>
              <p>Studio za precizan rad i miran tempo. Rezervisi online odmah.</p>
              <div className="hero-actions">
                <a className="button" href="#booking">
                  Zakazi termin
                </a>
                <Link className="button outline" href="/register">
                  Registracija
                </Link>
              </div>
              <div className="hero-highlights">
                <div className="hero-highlight reveal-item" data-reveal-item>
                  <span>Radno vreme</span>
                  <strong>{siteConfig.hours}</strong>
                </div>
                <div className="hero-highlight reveal-item" data-reveal-item>
                  <span>Potvrda termina</span>
                  <strong>U roku od 24h</strong>
                </div>
                <div className="hero-highlight reveal-item" data-reveal-item>
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
              <div className="hero-card reveal-item" data-reveal-item>
                <strong>Sta dobijas</strong>
                <ul>
                  <li>Precizan fade i ciste linije bez zurbe.</li>
                  <li>Jasno vreme i cena unapred.</li>
                  <li>Higijena i uredna postavka.</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section id="services" className="section">
          <div className="container">
            <div className="section-header reveal-on-scroll" data-reveal>
              <h2>Usluge</h2>
              <p>Jasne cene i trajanje. Izaberi tretman koji ti odgovara.</p>
            </div>
            <div className="services-grid reveal-on-scroll" data-reveal="stagger">
              {services.map((service) => (
                <div
                  key={service.id}
                  className="service-card reveal-item"
                  data-reveal-item
                >
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
            <div className="section-header reveal-on-scroll" data-reveal>
              <h2>Zakazivanje</h2>
              <p>Izaberi termin i posalji zahtev. Potvrdu saljemo brzo.</p>
            </div>
            <div className="booking-grid">
              <BookingForm />
              <div className="info-grid reveal-on-scroll" data-reveal="stagger">
                <div className="info-card reveal-item" data-reveal-item>
                  <h4>Potvrda termina</h4>
                  <p>Javljamo SMS-om ili pozivom. Ako nema termina, saljemo novi.</p>
                </div>
                <div className="info-card reveal-item" data-reveal-item>
                  <h4>Priprema</h4>
                  <p>Dodji 5 minuta ranije. Raspored je precizan.</p>
                </div>
                <div className="info-card reveal-item" data-reveal-item>
                  <h4>Politika otkazivanja</h4>
                  <p>Otkazivanje bar 6 sati ranije.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="studio" className="section">
          <div className="container">
            <div className="section-header reveal-on-scroll" data-reveal>
              <h2>Studio</h2>
              <p>Mirna atmosfera i ogranicen broj termina.</p>
            </div>
            <div className="info-grid reveal-on-scroll" data-reveal="stagger">
              <div className="info-card reveal-item" data-reveal-item>
                <h4>Radno vreme</h4>
                <p>{siteConfig.hours}</p>
              </div>
              <div className="info-card reveal-item" data-reveal-item>
                <h4>Lokacija</h4>
                <p>Lokacija se salje uz potvrdu.</p>
              </div>
              <div className="info-card reveal-item" data-reveal-item>
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
            <div className="map-card reveal-on-scroll" data-reveal>
              <iframe
                title="Doctor Barber lokacija"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2903.2545068929708!2d21.8622563!3d43.3089314!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x4755b0b14f921bab%3A0xa0b0730c4935e4ae!2sDoctor%20Barber!5e0!3m2!1sen!2srs!4v1766882078982!5m2!1sen!2srs"
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
              <div className="map-actions">
                <a
                  className="button outline"
                  href="https://maps.app.goo.gl/V9ZjSA8dCXB2cwbn7"
                  target="_blank"
                  rel="noreferrer"
                >
                  Otvori u Google Maps
                </a>
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
