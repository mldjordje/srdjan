"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import BookingForm from "@/components/BookingForm";
import { fetchServices, getActiveServices, services as fallbackServices, type Service } from "@/lib/services";
import { siteConfig } from "@/lib/site";

export default function HomePage() {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";
  const [showLoader, setShowLoader] = useState(true);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [serviceItems, setServiceItems] = useState<Service[]>(fallbackServices);
  const [isClientLoggedIn, setIsClientLoggedIn] = useState(false);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const activeServices = useMemo(() => getActiveServices(serviceItems), [serviceItems]);
  const year = new Date().getFullYear();
  const easeOut: [number, number, number, number] = [0.16, 1, 0.3, 1];
  const easeSmooth: [number, number, number, number] = [0.2, 0.9, 0.3, 1];

  useEffect(() => {
    const timeout = window.setTimeout(() => setShowLoader(false), 1400);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("db_client_token");
    setIsClientLoggedIn(Boolean(token));
    setIsAdminLoggedIn(localStorage.getItem("db_admin_auth") === "true");
  }, []);

  useEffect(() => {
    document.body.style.overflow = showLoader ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [showLoader]);

  useEffect(() => {
    if (!apiBaseUrl) {
      return;
    }

    let active = true;
    fetchServices(apiBaseUrl)
      .then((items) => {
        if (active) {
          setServiceItems(items);
        }
      })
      .catch(() => {
        if (active) {
          setServiceItems(fallbackServices);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const handleNavToggle = () => setIsNavOpen((prev) => !prev);
  const handleNavClose = () => setIsNavOpen(false);
  const handleClientLogout = () => {
    localStorage.removeItem("db_client_token");
    localStorage.removeItem("db_client_name");
    localStorage.removeItem("db_client_phone");
    localStorage.removeItem("db_client_email");
    setIsClientLoggedIn(false);
    handleNavClose();
  };

  const sectionVariants = {
    hidden: {
      opacity: 0,
      y: prefersReducedMotion ? 0 : 26,
      scale: prefersReducedMotion ? 1 : 0.98,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
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
    hidden: {
      opacity: 0,
      y: prefersReducedMotion ? 0 : 16,
      scale: prefersReducedMotion ? 1 : 0.98,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: prefersReducedMotion
        ? { duration: 0 }
        : { duration: 0.55, ease: easeOut },
    },
  };

  const cardVariants = {
    hidden: {
      opacity: 0,
      y: prefersReducedMotion ? 0 : 20,
      scale: prefersReducedMotion ? 1 : 0.96,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: prefersReducedMotion
        ? { duration: 0 }
        : { duration: 0.7, ease: easeOut },
    },
  };

  const heroBgVariants = {
    hidden: { opacity: 0, scale: prefersReducedMotion ? 1 : 1.06 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: prefersReducedMotion
        ? { duration: 0 }
        : { duration: 1.1, ease: easeSmooth },
    },
  };

  const cardHover = prefersReducedMotion ? {} : { y: -8, scale: 1.02 };
  const cardTap = prefersReducedMotion ? {} : { scale: 0.98 };

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

      <header className={`nav nav--has-toggle${isNavOpen ? " is-open" : ""}`}>
        <div className="container nav-inner">
          <div className="nav-top">
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
            <button
              className="nav-toggle"
              type="button"
              aria-expanded={isNavOpen}
              aria-controls="primary-navigation"
              onClick={handleNavToggle}
            >
              <span className="nav-toggle__label">Meni</span>
              <span className="nav-toggle__icon" aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
            </button>
          </div>
          <nav
            id="primary-navigation"
            className={`nav-links${isNavOpen ? " is-open" : ""}`}
          >
            <a href="#services" onClick={handleNavClose}>
              Usluge
            </a>
            <a href="#booking" onClick={handleNavClose}>
              Zakazivanje
            </a>
            <a href="#studio" onClick={handleNavClose}>
              Studio
            </a>
            {isClientLoggedIn && (
              <Link href="/moji-termini" onClick={handleNavClose}>
                Moji termini
              </Link>
            )}
            {!isClientLoggedIn && (
              <Link href="/login" onClick={handleNavClose}>
                Prijava
              </Link>
            )}
            {!isClientLoggedIn && (
              <Link
                className="button small outline"
                href="/register"
                onClick={handleNavClose}
              >
                Registracija
              </Link>
            )}
            {isClientLoggedIn && (
              <button className="button small ghost" type="button" onClick={handleClientLogout}>
                Odjava
              </button>
            )}
            {isAdminLoggedIn && (
              <Link className="button small ghost" href="/admin" onClick={handleNavClose}>
                CMS
              </Link>
            )}
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
          <motion.div className="hero-minimal__bg" variants={heroBgVariants}>
            <Image
              src="/newhero.jpg"
              alt="Doctor Barber studio"
              fill
              priority
              sizes="100vw"
            />
          </motion.div>
          <div className="hero-minimal__glow" aria-hidden="true" />
          <div className="hero-minimal__grain" aria-hidden="true" />
          <div className="container hero-minimal__inner">
            <motion.div className="hero-actions hero-actions--stack" variants={staggerVariants}>
              <motion.div variants={itemVariants}>
                <a className="button hero-primary" href="#booking">
                  Zakazi termin
                </a>
              </motion.div>
              {!isClientLoggedIn && (
                <motion.div variants={itemVariants}>
                  <Link className="button ghost hero-secondary" href="/login">
                    Prijava
                  </Link>
                </motion.div>
              )}
              {!isClientLoggedIn && (
                <motion.div variants={itemVariants}>
                  <Link className="button outline hero-secondary" href="/register">
                    Registracija
                  </Link>
                </motion.div>
              )}
              {isClientLoggedIn && (
                <motion.div variants={itemVariants}>
                  <Link className="button ghost hero-secondary" href="/moji-termini">
                    Moji termini
                  </Link>
                </motion.div>
              )}
              {isClientLoggedIn && (
                <motion.div variants={itemVariants}>
                  <button
                    className="button outline hero-secondary"
                    type="button"
                    onClick={handleClientLogout}
                  >
                    Odjava
                  </button>
                </motion.div>
              )}
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
            <motion.div
              className="booking-stage__frame"
              variants={cardVariants}
              whileHover={cardHover}
              whileTap={cardTap}
            >
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
              <p>Pregled usluga i trajanja. Cene prikazujemo u zakazivanju.</p>
            </motion.div>
            <motion.div className="services-grid" variants={staggerVariants}>
              {activeServices.map((service) => (
                <motion.div
                  key={service.id}
                  className="service-card"
                  variants={cardVariants}
                  whileHover={cardHover}
                  whileTap={cardTap}
                >
                  <h3>{service.name}</h3>
                  <div className="service-meta">
                    <span>{service.duration}</span>
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
              <motion.div
                className="info-card"
                variants={cardVariants}
                whileHover={cardHover}
                whileTap={cardTap}
              >
                <h4>Priprema</h4>
                <p>Dodji 5 minuta ranije. Raspored je precizan.</p>
              </motion.div>
              <motion.div
                className="info-card"
                variants={cardVariants}
                whileHover={cardHover}
                whileTap={cardTap}
              >
                <h4>Politika otkazivanja</h4>
                <p>Otkazivanje obavezno minimum 2 sata ranije. U suprotnom se termin smatra naplatnim.</p>
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
              <motion.div
                className="info-card"
                variants={cardVariants}
                whileHover={cardHover}
                whileTap={cardTap}
              >
                <h4>Radno vreme</h4>
                <p>{siteConfig.hours}</p>
              </motion.div>
              <motion.div
                className="info-card"
                variants={cardVariants}
                whileHover={cardHover}
                whileTap={cardTap}
              >
                <h4>Lokacija</h4>
                <p>Lokacija se salje uz potvrdu.</p>
              </motion.div>
              <motion.div
                className="info-card"
                variants={cardVariants}
                whileHover={cardHover}
                whileTap={cardTap}
              >
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
            <motion.div
              className="map-card"
              variants={cardVariants}
              whileHover={cardHover}
              whileTap={cardTap}
            >
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
        <motion.section
          className="section gallery"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={sectionVariants}
        >
          <div className="container">
            <motion.div className="section-header" variants={itemVariants}>
              <h2>Galerija / Ambijent</h2>
              <p>Dve scene iz studija koje najbolje opisuju atmosferu.</p>
            </motion.div>
            <motion.div className="gallery-grid" variants={staggerVariants}>
              <motion.div
                className="gallery-card"
                variants={cardVariants}
                whileHover={cardHover}
                whileTap={cardTap}
              >
                <Image
                  src="/newhero.jpg"
                  alt="Ambijent studija"
                  fill
                  sizes="(max-width: 900px) 100vw, 50vw"
                />
              </motion.div>
              <motion.div
                className="gallery-card"
                variants={cardVariants}
                whileHover={cardHover}
                whileTap={cardTap}
              >
                <Image
                  src="/new1.jpg"
                  alt="Detalji enterijera"
                  fill
                  sizes="(max-width: 900px) 100vw, 50vw"
                />
              </motion.div>
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





















