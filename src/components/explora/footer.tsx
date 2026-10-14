"use client";

import Image from "next/image";
import type { MouseEvent, ReactNode } from "react";
import { bus } from "@/lib/bus";
import styles from "./footer.module.css";

type Item = { label: string; href: string; onClick?: () => void };

const COLUMNS: readonly { title: string; items: readonly Item[] }[] = [
  {
    title: "Explorar",
    items: [
      { label: "Marketplace", href: "#contenido", onClick: () => bus.emit("view", "market") },
      { label: "Explora", href: "#contenido", onClick: () => bus.emit("view", "explora") },
      {
        label: "Ofertas",
        href: "#contenido",
        onClick: () => {
          bus.emit("market:filters", { sale: true });
          bus.emit("view", "market");
        },
      },
    ],
  },
  {
    title: "EMER",
    items: [
      // TODO: página Sobre EMER (otra fase).
      { label: "Sobre EMER", href: "#" },
      {
        label: "Sugerir marca",
        href: "#sugerir-marca",
        onClick: () => bus.emit("suggest:open", null),
      },
      // TODO: página de Contacto (otra fase).
      { label: "Contacto", href: "#" },
    ],
  },
  {
    title: "Legal",
    // TODO: páginas legales (otra fase).
    items: [
      { label: "Privacidad", href: "#" },
      { label: "Términos", href: "#" },
      { label: "Cookies", href: "#" },
    ],
  },
];

const SOCIAL: readonly { label: string; href: string; icon: ReactNode }[] = [
  {
    label: "Instagram",
    // TODO: URL real de Instagram.
    href: "#",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        aria-hidden="true"
      >
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4.2" />
        <circle cx="17.4" cy="6.6" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    label: "TikTok",
    // TODO: URL real de TikTok.
    href: "#",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M16.6 2h-3.3v13.3a2.9 2.9 0 1 1-2.9-2.9c.3 0 .6 0 .9.1V9.1a6.3 6.3 0 1 0 5.3 6.2V8.6a7.6 7.6 0 0 0 4.4 1.4V6.7a4.4 4.4 0 0 1-4.4-4.7z" />
      </svg>
    ),
  },
];

const run = (onClick: () => void) => (event: MouseEvent<HTMLAnchorElement>) => {
  event.preventDefault();
  onClick();
};

/**
 * Footer de Explora (handoff_sugerir_footer/README.md §2): el coche negro a todo el ancho y los
 * textos en blanco dentro de sus zonas negras (trasera, puerta, morro), posicionados en % del
 * contenedor `2119/611`.
 */
export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.car}>
        <Image
          className={styles.image}
          src="/assets/footer-car.png"
          alt=""
          width={2119}
          height={611}
          sizes="100vw"
        />
        <div className={styles.rear}>
          <span className={styles.brand}>EMER</span>
          <span className={styles.copy}>© 2026</span>
        </div>
        <nav className={styles.door} aria-label="Pie de página">
          {COLUMNS.map((column) => (
            <div key={column.title} className={styles.column}>
              <span className={styles.title}>{column.title}</span>
              {column.items.map((item) => (
                <a
                  key={item.label}
                  className={styles.link}
                  href={item.href}
                  onClick={item.onClick && run(item.onClick)}
                >
                  {item.label}
                </a>
              ))}
            </div>
          ))}
        </nav>
        <div className={styles.nose}>
          {SOCIAL.map((social) => (
            <a
              key={social.label}
              className={styles.social}
              href={social.href}
              aria-label={social.label}
            >
              {social.icon}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
