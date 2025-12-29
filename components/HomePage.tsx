"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import BookingForm from "@/components/BookingForm";
import { services } from "@/lib/services";
import { siteConfig } from "@/lib/site";

export default function HomePage() {
  const [showLoader, setShowLoader] = useState(true);
  const prefersReducedMotion = useReducedMotion();
  const year = new Date().getFullYear();
  const easeOut: [number, number, number, number] = [0.16, 1, 0.3, 1];
  const easeSmooth: [number, number, number, number] = [0.2, 0.9, 0.3, 1];

  useEffect(() => {
    const timeout = window.setTimeout(() => setShowLoader(false), 1400);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    document.body.style.overflow = showLoader ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [showLoader]);

  const sectionVariants = {
    hidden: { opacity: 0, y: prefersReducedMotion ? 0 : 26 },
    visible: {
      opacity: 1,
      y: 0,
      transition: prefersReducedMotion
        ? { duration: 0 }
        : { duration: 0.8, ease: easeOut },
    },
  };

  const staggerVariants = {
    hidden: {},
    visible: {
      transition: prefersReducedMotion
        ? {}
        : { staggerChildren: 0.12, delayChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: prefersReducedMotion ? 0 : 16 },
    visible: {
      opacity: 1,
      y: 0,
      transition: prefersReducedMotion
        ? { duration: 0 }
        : { duration: 0.55, ease: easeOut },
    },
  };

  return (
    <div className="page">
      <AnimatePresence>
        {showLoader && (
          <motion.div
            className="preloader"
            initial={{ opacity: 1 }}
            exit={{
              opacity: 0,
              transition: prefersReducedMotion
                ? { duration: 0 }
                : { duration: 0.6, ease: "easeInOut" },
            }}
          >
            <div className="preloader-glow" aria-hidden="true" />
            <motion.div
              className="preloader-card"
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{
                scale: 1,
                opacity: 1,
                ...(prefersReducedMotion
                  ? {}
                  : {
                      boxShadow: [
                        "0 0 0 rgba(0, 0, 0, 0)",
                        "0 20px 60px rgba(0, 0, 0, 0.35)",
                        "0 12px 40px rgba(0, 0, 0, 0.28)",
                      ],
                    }),
              }}
              transition={
                prefersReducedMotion
                  ? { duration: 0 }
                  : { duration: 0.9, ease: easeSmooth }
              }
            >
              <div className="preloader-brand">
                <div className="preloader-mark">
                  <Image src="/logo.png" alt="Doctor Barber" width={42} height={42} />
                </div>
                <div className="preloader-title">
                  <span>Doctor Barber</span>
                  <span>Barber Studio</span>
                </div>
              </div>
              <div className="preloader-bars" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <motion.div
                className="preloader-pulse"
                animate={
                  prefersReducedMotion ? { opacity: 1 } : { opacity: [0.3, 1, 0.5] }
                }
                transition={
                  prefersReducedMotion
                    ? { duration: 0 }
                    : { duration: 1.1, repeat: Infinity, ease: "easeInOut" }
                }
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
            <Link href="/moji-termini">Moji termini</Link>
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
        <motion.section
          className="hero-minimal"
          initial="hidden"
          animate="visible"
          variants={sectionVariants}
        >
          <div className="hero-minimal__glow" aria-hidden="true" />
          <div className="hero-minimal__grain" aria-hidden="true" />
          <div className="container hero-minimal__inner">
            <motion.div className="hero-actions hero-actions--stack" variants={staggerVariants}>
              <motion.div variants={itemVariants}>
                <a className="button hero-primary" href="#booking">
                  Zakazi termin
                </a>
              </motion.div>
              <motion.div variants={itemVariants}>
                <Link className="button ghost hero-secondary" href="/login">
                  Prijava
                </Link>
              </motion.div>
              <motion.div variants={itemVariants}>
                <Link className="button outline hero-secondary" href="/register">
                  Registracija
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </motion.section>

        <motion.section
          id="booking"
          className="section booking-stage"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.25 }}
          variants={sectionVariants}
        >
          <div className="container">
            <motion.div className="booking-stage__frame" variants={itemVariants}>
              <BookingForm />
            </motion.div>
          </div>
        </motion.section>

        <motion.section
          id="services"
          className="section"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={sectionVariants}
        >
          <div className="container">
            <motion.div className="section-header" variants={itemVariants}>
              <h2>Usluge</h2>
              <p>Jasne cene i trajanje. Izaberi tretman koji ti odgovara.</p>
            </motion.div>
            <motion.div className="services-grid" variants={staggerVariants}>
              {services.map((service) => (
                <motion.div
                  key={service.id}
                  className="service-card"
                  variants={itemVariants}
                >
                  <h3>{service.name}</h3>
                  <div className="service-meta">
                    <span>{service.duration}</span>
                    <span className="price">
                      RSD {service.price.toLocaleString("sr-RS")}
                    </span>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </motion.section>

        <motion.section
          className="section details"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.25 }}
          variants={sectionVariants}
        >
          <div className="container">
            <motion.div className="section-header" variants={itemVariants}>
              <h2>Kako funkcionise</h2>
              <p>Brzo, jasno i bez cekanja. Zakazi, potvrdi, dodji na vreme.</p>
            </motion.div>
            <motion.div className="info-grid" variants={staggerVariants}>
              <motion.div className="info-card" variants={itemVariants}>
                <h4>Potvrda termina</h4>
                <p>Javljamo SMS-om ili pozivom. Ako nema termina, saljemo novi.</p>
              </motion.div>
              <motion.div className="info-card" variants={itemVariants}>
                <h4>Priprema</h4>
                <p>Dodji 5 minuta ranije. Raspored je precizan.</p>
              </motion.div>
              <motion.div className="info-card" variants={itemVariants}>
                <h4>Politika otkazivanja</h4>
                <p>Otkazivanje bar 6 sati ranije.</p>
              </motion.div>
            </motion.div>
          </div>
        </motion.section>

        <motion.section
          id="studio"
          className="section"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={sectionVariants}
        >
          <div className="container">
            <motion.div className="section-header" variants={itemVariants}>
              <h2>Studio</h2>
              <p>Mirna atmosfera i ogranicen broj termina.</p>
            </motion.div>
            <motion.div className="info-grid" variants={staggerVariants}>
              <motion.div className="info-card" variants={itemVariants}>
                <h4>Radno vreme</h4>
                <p>{siteConfig.hours}</p>
              </motion.div>
              <motion.div className="info-card" variants={itemVariants}>
                <h4>Lokacija</h4>
                <p>Lokacija se salje uz potvrdu.</p>
              </motion.div>
              <motion.div className="info-card" variants={itemVariants}>
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
              </motion.div>
            </motion.div>
            <motion.div className="map-card" variants={itemVariants}>
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
            </motion.div>
          </div>
        </motion.section>
      </main>

      <footer className="footer">
        <div className="container">
          <p>Doctor Barber | {year}</p>
        </div>
      </footer>
    </div>
  );
}
