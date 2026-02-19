"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Card, CardBody, Button as HeroButton } from "@heroui/react";

import SrdjanApp from "@/components/srdjan/SrdjanApp";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useLanguage, type Language } from "@/lib/useLanguage";
import { siteConfig } from "@/lib/site";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const content: Record<
  Language,
  {
    menu: string;
    navBooking: string;
    navStudio: string;
    navMyAppointments: string;
    login: string;
    register: string;
    logout: string;
    installTitle: string;
    installSubtitle: string;
    close: string;
    installHttpsHint: string;
    bookNow: string;
    installApp: string;
    howTitle: string;
    howSubtitle: string;
    prepTitle: string;
    prepText: string;
    cancelTitle: string;
    cancelText: string;
    studioTitle: string;
    studioSubtitle: string;
    hours: string;
    location: string;
    locationText: string;
    contact: string;
    contactFallback: string;
    openMaps: string;
    galleryTitle: string;
    galleryText: string;
    reviewTitle: string;
    reviewText: string;
    reviewBody: string;
    reviewSeo: string;
    reviewButton: string;
    instagramTitle: string;
    instagramText: string;
    instagramHandle: string;
    instagramButton: string;
    homepageNoticeDefault: string;
  }
> = {
  sr: {
    menu: "Meni",
    navBooking: "Zakazivanje",
    navStudio: "Studio",
    navMyAppointments: "Moji termini",
    login: "Prijava",
    register: "Registracija",
    logout: "Odjava",
    installTitle: "Instaliraj Frizerski salon Srdjan",
    installSubtitle: "Dodaj aplikaciju na pocetni ekran.",
    close: "Zatvori",
    installHttpsHint: "Instalacija se pojavi samo kada je sajt otvoren preko HTTPS.",
    bookNow: "Zakazi termin",
    installApp: "Instaliraj aplikaciju",
    howTitle: "Kako funkcionise",
    howSubtitle: "Brzo, jasno i bez cekanja. Zakazi, potvrdi, dodji na vreme.",
    prepTitle: "Priprema",
    prepText: "Dodji 5 minuta ranije. Raspored je precizan.",
    cancelTitle: "Politika otkazivanja",
    cancelText: "Otkazivanje obavezno minimum 2 sata ranije. U suprotnom se termin smatra naplatnim.",
    studioTitle: "Studio",
    studioSubtitle: "Mirna atmosfera i ogranicen broj termina.",
    hours: "Radno vreme",
    location: "Lokacija",
    locationText: "Lokacija se salje uz potvrdu.",
    contact: "Kontakt",
    contactFallback: "Kontakt podaci se dodaju nakon aktivacije domena.",
    openMaps: "Otvori u Google Maps",
    galleryTitle: "Galerija / Ambijent",
    galleryText: "Dve scene iz studija koje najbolje opisuju atmosferu.",
    reviewTitle: "Oceni nas na Google",
    reviewText:
      "Ako si zadovoljan uslugom, ostavi kratku ocenu. Hvala na podrsci lokalnom salonu.",
    reviewBody: "Moderno sisanje, fade i brada. Tvoja preporuka nam puno znaci.",
    reviewSeo: "Frizerski salon Srdjan za sisanje, fade i uredjivanje brade.",
    reviewButton: "Oceni na Google",
    instagramTitle: "Instagram",
    instagramText: "Prati najnovije transformacije, fade radove i dnevni vibe iz studija.",
    instagramHandle: "@salon_srdjan",
    instagramButton: "Zapratite nas",
    homepageNoticeDefault: "",
  },
  en: {
    menu: "Menu",
    navBooking: "Booking",
    navStudio: "Studio",
    navMyAppointments: "My appointments",
    login: "Login",
    register: "Register",
    logout: "Logout",
    installTitle: "Install Frizerski salon Srdjan",
    installSubtitle: "Add the app to your home screen.",
    close: "Close",
    installHttpsHint: "Install prompt appears only when the site is opened via HTTPS.",
    bookNow: "Book now",
    installApp: "Install app",
    howTitle: "How it works",
    howSubtitle: "Fast, clear, and no waiting. Book, confirm, arrive on time.",
    prepTitle: "Preparation",
    prepText: "Arrive 5 minutes earlier. The schedule is precise.",
    cancelTitle: "Cancellation policy",
    cancelText: "Cancellation is required at least 2 hours in advance.",
    studioTitle: "Studio",
    studioSubtitle: "Calm atmosphere and limited appointment slots.",
    hours: "Working hours",
    location: "Location",
    locationText: "Location is shared with the confirmation message.",
    contact: "Contact",
    contactFallback: "Contact details will be added after domain activation.",
    openMaps: "Open in Google Maps",
    galleryTitle: "Gallery / Atmosphere",
    galleryText: "Two scenes from the studio that best describe the vibe.",
    reviewTitle: "Rate us on Google",
    reviewText: "If you liked the service, leave a short review. Thank you for supporting local business.",
    reviewBody: "Classic haircut, fade, and beard service. Your recommendation means a lot.",
    reviewSeo: "Frizerski salon Srdjan for fade cuts, classic cuts, and beard grooming.",
    reviewButton: "Rate on Google",
    instagramTitle: "Instagram",
    instagramText: "Follow our latest transformations, fade work, and daily studio vibe.",
    instagramHandle: "@salon_srdjan",
    instagramButton: "Follow us",
    homepageNoticeDefault: "",
  },
  it: {
    menu: "Menu",
    navBooking: "Prenotazione",
    navStudio: "Studio",
    navMyAppointments: "I miei appuntamenti",
    login: "Accedi",
    register: "Registrati",
    logout: "Esci",
    installTitle: "Installa Frizerski salon Srdjan",
    installSubtitle: "Aggiungi l'app alla schermata principale.",
    close: "Chiudi",
    installHttpsHint: "L'installazione appare solo quando il sito e aperto in HTTPS.",
    bookNow: "Prenota ora",
    installApp: "Installa app",
    howTitle: "Come funziona",
    howSubtitle: "Veloce, chiaro, senza attese. Prenota, conferma, arriva puntuale.",
    prepTitle: "Preparazione",
    prepText: "Arriva 5 minuti prima. Il programma e preciso.",
    cancelTitle: "Politica di cancellazione",
    cancelText: "La cancellazione e richiesta almeno 2 ore prima.",
    studioTitle: "Studio",
    studioSubtitle: "Atmosfera calma e numero limitato di appuntamenti.",
    hours: "Orari",
    location: "Posizione",
    locationText: "La posizione viene inviata con la conferma.",
    contact: "Contatto",
    contactFallback: "I contatti saranno aggiunti dopo l'attivazione del dominio.",
    openMaps: "Apri in Google Maps",
    galleryTitle: "Galleria / Atmosfera",
    galleryText: "Due scene dello studio che descrivono al meglio l'atmosfera.",
    reviewTitle: "Lascia una recensione su Google",
    reviewText: "Se sei soddisfatto, lascia una recensione breve. Grazie per il supporto.",
    reviewBody: "Taglio classico, fade e barba. Il tuo consiglio e molto importante.",
    reviewSeo: "Frizerski salon Srdjan per fade, taglio classico e cura della barba.",
    reviewButton: "Recensisci su Google",
    instagramTitle: "Instagram",
    instagramText: "Segui trasformazioni recenti, lavori fade e atmosfera quotidiana dello studio.",
    instagramHandle: "@salon_srdjan",
    instagramButton: "Seguici",
    homepageNoticeDefault: "",
  },
};

export default function HomePage() {
  const { language } = useLanguage();
  const copy = content[language];
  const [showLoader, setShowLoader] = useState(true);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isClientLoggedIn, setIsClientLoggedIn] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installModalOpen, setInstallModalOpen] = useState(false);
  const [installPlatform, setInstallPlatform] = useState<"ios" | "android" | "desktop" | "other">("other");
  const [homepageNotice, setHomepageNotice] = useState("");
  const prefersReducedMotion = useReducedMotion();
  const year = new Date().getFullYear();
  const easeOut: [number, number, number, number] = [0.16, 1, 0.3, 1];
  const easeSmooth: [number, number, number, number] = [0.2, 0.9, 0.3, 1];

  useEffect(() => {
    const timeout = window.setTimeout(() => setShowLoader(false), 1400);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch("/api/public/session/me");
        setIsClientLoggedIn(response.ok);
      } catch {
        setIsClientLoggedIn(false);
      }
    };
    checkSession().catch(() => setIsClientLoggedIn(false));
  }, []);

  useEffect(() => {
    document.body.style.overflow = showLoader ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [showLoader]);

  useEffect(() => {
    const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      Boolean(navigatorWithStandalone.standalone);
    const ua = navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(ua);
    const isAndroid = /android/.test(ua);

    setIsInstalled(standalone);
    if (isIos) {
      setInstallPlatform("ios");
    } else if (isAndroid) {
      setInstallPlatform("android");
    } else if (ua.includes("windows") || ua.includes("macintosh") || ua.includes("linux")) {
      setInstallPlatform("desktop");
    } else {
      setInstallPlatform("other");
    }
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    };

    if (document.readyState === "complete") {
      register();
      return;
    }

    window.addEventListener("load", register);
    return () => {
      window.removeEventListener("load", register);
    };
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setInstallPrompt(null);
      setIsInstalled(true);
      setInstallModalOpen(false);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  useEffect(() => {
    setHomepageNotice(copy.homepageNoticeDefault);
  }, [copy.homepageNoticeDefault]);

  const handleNavToggle = () => setIsNavOpen((prev) => !prev);
  const handleNavClose = () => setIsNavOpen(false);
  const handleClientLogout = async () => {
    await fetch("/api/public/session/logout", { method: "POST" });
    setIsClientLoggedIn(false);
    handleNavClose();
  };

  const handleInstallModalClose = () => {
    setInstallModalOpen(false);
  };

  const handleInstallClick = async () => {
    if (!installPrompt) {
      setInstallModalOpen(true);
      return;
    }

    try {
      await installPrompt.prompt();
      await installPrompt.userChoice;
    } finally {
      setInstallPrompt(null);
    }
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
  const showInstallButton = !isInstalled;
  const installSteps = {
    ios: [
      language === "sr"
        ? { title: "Otvori Share meni", body: "U Safari klikni Share ikonicu." }
        : language === "en"
          ? { title: "Open Share menu", body: "In Safari, tap the Share icon." }
          : { title: "Apri menu Share", body: "In Safari tocca l'icona Share." },
      language === "sr"
        ? { title: "Izaberi Add to Home Screen", body: "Skroluj meni i tapni Add to Home Screen." }
        : language === "en"
          ? { title: "Choose Add to Home Screen", body: "Scroll and tap Add to Home Screen." }
          : { title: "Scegli Add to Home Screen", body: "Scorri il menu e tocca Add to Home Screen." },
      language === "sr"
        ? { title: "Potvrdi instalaciju", body: "Tapni Add i aplikacija ce biti na ekranu." }
        : language === "en"
          ? { title: "Confirm install", body: "Tap Add and the app will appear on your screen." }
          : { title: "Conferma installazione", body: "Tocca Add e l'app apparira sullo schermo." },
    ],
    android: [
      language === "sr"
        ? { title: "Otvori browser meni", body: "Klikni na tri tacke u Chrome-u." }
        : language === "en"
          ? { title: "Open browser menu", body: "Tap the three dots in Chrome." }
          : { title: "Apri menu browser", body: "Tocca i tre puntini in Chrome." },
      language === "sr"
        ? { title: "Izaberi Install app", body: "Opcija je Install app ili Add to Home screen." }
        : language === "en"
          ? { title: "Choose Install app", body: "Option is Install app or Add to Home screen." }
          : { title: "Scegli Install app", body: "L'opzione e Install app o Add to Home screen." },
      language === "sr"
        ? { title: "Potvrdi instalaciju", body: "Potvrdi i aplikacija je na pocetnom ekranu." }
        : language === "en"
          ? { title: "Confirm install", body: "Confirm and the app is added to home screen." }
          : { title: "Conferma installazione", body: "Conferma e l'app sara nella schermata iniziale." },
    ],
    desktop: [
      language === "sr"
        ? { title: "Nadji install ikonu", body: "U Chrome/Edge klikni ikonu pored adrese." }
        : language === "en"
          ? { title: "Find install icon", body: "In Chrome/Edge click the icon near address bar." }
          : { title: "Trova icona installazione", body: "In Chrome/Edge clicca l'icona vicino alla barra indirizzi." },
      language === "sr"
        ? { title: "Potvrdi instalaciju", body: "Izaberi Install i aplikacija se otvara kao app." }
        : language === "en"
          ? { title: "Confirm install", body: "Click Install and app opens like a desktop app." }
          : { title: "Conferma installazione", body: "Scegli Install e l'app si apre come app desktop." },
    ],
    other: [
      language === "sr"
        ? { title: "Proveri browser meni", body: "Potrazi opciju Install app ili Add to Home screen." }
        : language === "en"
          ? { title: "Check browser menu", body: "Find Install app or Add to Home screen option." }
          : { title: "Controlla menu browser", body: "Cerca Install app o Add to Home screen." },
      language === "sr"
        ? { title: "Potvrdi instalaciju", body: "Potvrdi i ikonica se pojavi na ekranu." }
        : language === "en"
          ? { title: "Confirm install", body: "Confirm and icon will show on your screen." }
          : { title: "Conferma installazione", body: "Conferma e l'icona apparira sullo schermo." },
    ],
  };
  const steps = installSteps[installPlatform];

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
                  <span className="preloader-mark__text">FS</span>
                </div>
                <div className="preloader-title">
                  <span>Frizerski salon</span>
                  <span>Srdjan</span>
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
                <span className="brand-mark__text">FS</span>
              </div>
              <div className="brand-title">
                <span>Frizerski salon</span>
                <span>Srdjan</span>
              </div>
            </div>
            <button
              className="nav-toggle"
              type="button"
              aria-expanded={isNavOpen}
              aria-controls="primary-navigation"
              onClick={handleNavToggle}
            >
              <span className="nav-toggle__label">{copy.menu}</span>
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
            <LanguageSwitcher compact />
            <a href="#booking" onClick={handleNavClose}>
              {copy.navBooking}
            </a>
            <a href="#studio" onClick={handleNavClose}>
              {copy.navStudio}
            </a>
            {isClientLoggedIn && (
              <Link href="/moji-termini" onClick={handleNavClose}>
                {copy.navMyAppointments}
              </Link>
            )}
            {!isClientLoggedIn && (
              <Link href="/login" onClick={handleNavClose}>
                {copy.login}
              </Link>
            )}
            {!isClientLoggedIn && (
              <Link
                className="button small outline"
                href="/register"
                onClick={handleNavClose}
              >
                {copy.register}
              </Link>
            )}
            {isClientLoggedIn && (
              <button className="button small ghost" type="button" onClick={() => { void handleClientLogout(); }}>
                {copy.logout}
              </button>
            )}
          </nav>
        </div>
      </header>

      {installModalOpen && (
        <div className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="install-title">
          <div className="confirm-modal__backdrop" onClick={handleInstallModalClose} />
          <div className="confirm-modal__card install-modal__card">
            <div className="confirm-modal__header">
              <div>
                <h3 id="install-title">{copy.installTitle}</h3>
                <p className="install-modal__subtitle">{copy.installSubtitle}</p>
              </div>
              <button
                className="confirm-modal__close"
                type="button"
                onClick={handleInstallModalClose}
                aria-label={copy.close}
              >
                ×
              </button>
            </div>
            <div className="install-modal__body">
              <div className="install-steps">
                {steps.map((step, index) => (
                  <div key={step.title} className="install-step">
                    <div className="install-step__index">{index + 1}</div>
                    <div className="install-step__content">
                      <div className="install-step__title">{step.title}</div>
                      <div className="install-step__desc">{step.body}</div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="install-modal__hint">
                {copy.installHttpsHint}
              </p>
            </div>
            <div className="confirm-modal__actions">
              <button className="button ghost" type="button" onClick={handleInstallModalClose}>
                {copy.close}
              </button>
            </div>
          </div>
        </div>
      )}

      {homepageNotice && (
        <motion.div
          className="site-notice-wrap"
          initial={{ opacity: 0, y: prefersReducedMotion ? 0 : -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.4, ease: easeOut }}
        >
          <div className="container">
            <div className="site-notice" role="status" aria-live="polite">
              <span className="site-notice__dot" aria-hidden="true" />
              <p>{homepageNotice}</p>
            </div>
          </div>
        </motion.div>
      )}

      <main>
        <motion.section
          className="hero-minimal"
          initial="hidden"
          animate="visible"
          variants={sectionVariants}
        >
          <motion.div className="hero-minimal__bg" variants={heroBgVariants}>
            <div className="hero-minimal__bg-art" aria-hidden="true" />
          </motion.div>
          <div className="hero-minimal__glow" aria-hidden="true" />
          <div className="hero-minimal__grain" aria-hidden="true" />
          <div className="container hero-minimal__inner">
            <motion.div className="hero-actions hero-actions--stack" variants={staggerVariants}>
              <motion.div variants={itemVariants}>
                <a className="button hero-primary" href="#booking">
                  {copy.bookNow}
                </a>
              </motion.div>
              {showInstallButton && (
                <motion.div variants={itemVariants}>
                  <button
                    className="button outline hero-secondary"
                    type="button"
                    onClick={handleInstallClick}
                  >
                    {copy.installApp}
                  </button>
                </motion.div>
              )}
              {!isClientLoggedIn && (
                <motion.div variants={itemVariants}>
                  <Link className="button ghost hero-secondary" href="/login">
                    {copy.login}
                  </Link>
                </motion.div>
              )}
              {!isClientLoggedIn && (
                <motion.div variants={itemVariants}>
                  <Link className="button outline hero-secondary" href="/register">
                    {copy.register}
                  </Link>
                </motion.div>
              )}
              {isClientLoggedIn && (
                <motion.div variants={itemVariants}>
                  <Link className="button ghost hero-secondary" href="/moji-termini">
                    {copy.navMyAppointments}
                  </Link>
                </motion.div>
              )}
              {isClientLoggedIn && (
                <motion.div variants={itemVariants}>
                  <button
                    className="button outline hero-secondary"
                    type="button"
                    onClick={() => { void handleClientLogout(); }}
                  >
                    {copy.logout}
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
              <SrdjanApp embedded />
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
              <h2>{copy.howTitle}</h2>
              <p>{copy.howSubtitle}</p>
            </motion.div>
            <motion.div className="info-grid" variants={staggerVariants}>
              <motion.div
                className="info-card"
                variants={cardVariants}
                whileHover={cardHover}
                whileTap={cardTap}
              >
                <h4>{copy.prepTitle}</h4>
                <p>{copy.prepText}</p>
              </motion.div>
              <motion.div
                className="info-card"
                variants={cardVariants}
                whileHover={cardHover}
                whileTap={cardTap}
              >
                <h4>{copy.cancelTitle}</h4>
                <p>{copy.cancelText}</p>
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
              <h2>{copy.studioTitle}</h2>
              <p>{copy.studioSubtitle}</p>
            </motion.div>
            <motion.div className="info-grid" variants={staggerVariants}>
              <motion.div
                className="info-card"
                variants={cardVariants}
                whileHover={cardHover}
                whileTap={cardTap}
              >
                <h4>{copy.hours}</h4>
                <p>{siteConfig.hours}</p>
              </motion.div>
              <motion.div
                className="info-card"
                variants={cardVariants}
                whileHover={cardHover}
                whileTap={cardTap}
              >
                <h4>{copy.location}</h4>
                <p>{copy.locationText}</p>
              </motion.div>
              <motion.div
                className="info-card"
                variants={cardVariants}
                whileHover={cardHover}
                whileTap={cardTap}
              >
                <h4>{copy.contact}</h4>
                <p>
                  {siteConfig.phone && <span>{siteConfig.phone}</span>}
                  {siteConfig.email && (
                    <span>
                      {siteConfig.phone ? " | " : ""}
                      {siteConfig.email}
                    </span>
                  )}
                  {!siteConfig.phone && !siteConfig.email && (
                    <span>{copy.contactFallback}</span>
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
                title="Frizerski salon Srdjan lokacija"
                src="https://www.google.com/maps?q=Belgrade&output=embed"
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
              <div className="map-actions">
                <a
                  className="button outline"
                  href="https://maps.google.com/?q=Belgrade"
                  target="_blank"
                  rel="noreferrer"
                >
                  {copy.openMaps}
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
              <h2>{copy.galleryTitle}</h2>
              <p>{copy.galleryText}</p>
            </motion.div>
            <motion.div className="gallery-grid" variants={staggerVariants}>
              <motion.div
                className="gallery-card"
                variants={cardVariants}
                whileHover={cardHover}
                whileTap={cardTap}
              >
                <div className="gallery-art gallery-art--one" aria-label="Ambijent studija" />
              </motion.div>
              <motion.div
                className="gallery-card"
                variants={cardVariants}
                whileHover={cardHover}
                whileTap={cardTap}
              >
                <div className="gallery-art gallery-art--two" aria-label="Detalji enterijera" />
              </motion.div>
            </motion.div>
          </div>
        </motion.section>

        <motion.section
          className="section instagram-section"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={sectionVariants}
        >
          <div className="container">
            <motion.div className="section-header" variants={itemVariants}>
              <h2>{copy.instagramTitle}</h2>
              <p>{copy.instagramText}</p>
            </motion.div>
            <motion.div className="instagram-showcase" variants={cardVariants}>
              <motion.div
                className="instagram-orb instagram-orb--one"
                animate={prefersReducedMotion ? {} : { y: [0, -10, 0] }}
                transition={prefersReducedMotion ? {} : { duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.div
                className="instagram-orb instagram-orb--two"
                animate={prefersReducedMotion ? {} : { y: [0, 8, 0] }}
                transition={prefersReducedMotion ? {} : { duration: 5.2, repeat: Infinity, ease: "easeInOut" }}
              />
              <Card className="instagram-card" shadow="lg">
                <CardBody>
                  <div className="instagram-card__head">
                    <strong>{copy.instagramHandle}</strong>
                    <span>Frizerski salon</span>
                  </div>
                  <div className="instagram-card__grid" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </div>
                  <HeroButton
                    as="a"
                    href="https://www.instagram.com/"
                    target="_blank"
                    rel="noreferrer"
                    color="primary"
                    radius="full"
                    className="instagram-card__button"
                  >
                    {copy.instagramButton}
                  </HeroButton>
                </CardBody>
              </Card>
            </motion.div>
          </div>
        </motion.section>

        <motion.section
          className="section review-section"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={sectionVariants}
        >
          <div className="container">
            <motion.div className="section-header" variants={itemVariants}>
              <h2>{copy.reviewTitle}</h2>
              <p>{copy.reviewText}</p>
            </motion.div>
            <motion.div className="banner review-banner" variants={cardVariants}>
              <div className="review-copy">
                <strong>Frizerski salon Srdjan</strong>
                <p>{copy.reviewBody}</p>
                <p className="seo-note">{copy.reviewSeo}</p>
              </div>
              <div className="review-actions">
                <a
                  className="button outline"
                  href="https://www.google.com/search?q=frizerski+salon+srdjan+reviews"
                  target="_blank"
                  rel="noreferrer"
                >
                  {copy.reviewButton}
                </a>
              </div>
            </motion.div>
          </div>
        </motion.section>
      </main>

      <footer className="footer">
        <div className="container">
          <p>Frizerski salon Srdjan | {year}</p>
        </div>
      </footer>
    </div>
  );
}
























