import { cacheLife } from "next/cache";
import { LINKS } from "@/lib/config/links";
import { decoStyles } from "./data";
import s from "./sugiere.module.css";
import { SugiereForm } from "./sugiere-form";

const MAIL = "hola@emer.app";

/** Semilla del jitter de los decorados, generada en servidor (sin salto al hidratar). */
async function decoSeed(): Promise<number> {
  "use cache";
  cacheLife("days");
  return Math.floor(Math.random() * 2 ** 31);
}

function MailIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="14" />
      <path d="M3 6l9 7 9-7" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r=".9" fill="currentColor" stroke="none" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.8 3h3.1l-6.8 7.8L22 21h-6.2l-4.9-6.4L5.3 21H2.2l7.3-8.3L2 3h6.4l4.4 5.8L17.8 3zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5z" />
    </svg>
  );
}

/** 07-sugiere: decorados y contacto en servidor; el formulario es la única parte cliente. */
export async function SugiereSection() {
  const decos = decoStyles(await decoSeed());
  return (
    <section id="sugiere" data-section="SUGIERE" aria-labelledby="sg-title" className={s.section}>
      <div className={s.deco} aria-hidden="true">
        {decos.map((d) => (
          <div
            key={d.file}
            className={s.decoItem}
            style={{
              left: d.left,
              right: d.right,
              top: d.top,
              bottom: d.bottom,
              width: d.width,
              aspectRatio: d.aspectRatio,
              transform: `rotate(${d.rotate}deg)`,
              backgroundImage: `url(/assets/deco/${d.file}.webp)`,
              backgroundPosition: d.pos,
              backgroundSize: d.size,
            }}
          />
        ))}
      </div>

      <div className={s.box}>
        <header className={s.head}>
          <p className={s.eyebrow}>SUGIERE UNA MARCA</p>
          <h2 id="sg-title" className={s.title}>
            ¿Falta
            <br />
            alguna?
          </h2>
        </header>

        <SugiereForm />

        <footer className={s.contact}>
          <div className={s.contactText}>
            <p className={s.contactTitle}>O CONTÁCTANOS</p>
            <p className={s.contactNote}>Para cualquier otra cosa.</p>
          </div>
          <nav aria-label="Contacto" className={s.icons}>
            <a href={`mailto:${MAIL}`} className={s.icon} aria-label={`Mail: ${MAIL}`}>
              <MailIcon />
            </a>
            {LINKS.instagram && (
              <a
                href={LINKS.instagram}
                className={s.icon}
                aria-label="Instagram (se abre en una pestaña nueva)"
                target="_blank"
                rel="noopener"
              >
                <InstagramIcon />
              </a>
            )}
            {LINKS.x && (
              <a
                href={LINKS.x}
                className={s.icon}
                aria-label="X (se abre en una pestaña nueva)"
                target="_blank"
                rel="noopener"
              >
                <XIcon />
              </a>
            )}
          </nav>
        </footer>
      </div>
    </section>
  );
}
