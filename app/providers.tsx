"use client";

import { useEffect } from "react";
import { HeroUIProvider } from "@heroui/react";
import { LanguageProvider } from "@/lib/useLanguage";

export default function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    const elements = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (elements.length === 0) {
      return;
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      elements.forEach((element) => element.classList.add("is-visible"));
      return;
    }

    elements.forEach((element) => {
      if (element.dataset.reveal === "stagger") {
        const items = Array.from(
          element.querySelectorAll<HTMLElement>("[data-reveal-item]")
        );
        items.forEach((item, index) => {
          item.style.setProperty("--reveal-delay", `${index * 90}ms`);
        });
      }
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" }
    );

    elements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, []);

  return (
    <LanguageProvider>
      <HeroUIProvider>{children}</HeroUIProvider>
    </LanguageProvider>
  );
}
