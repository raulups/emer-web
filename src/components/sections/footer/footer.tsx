import { cacheLife } from "next/cache";
import Image from "next/image";
import type { ReactNode } from "react";
import { LINKS } from "@/lib/config/links";

/** Año actual. Cacheado: `new Date()` directo rompe el prerender con Cache Components. */
async function currentYear(): Promise<number> {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}

const LINK_CLASS = "text-paper transition-colors duration-300 ease-standard hover:text-line-light";

/** Enlace del pie; sin destino se pinta como texto (estado «enlace sin destino» del handoff). */
function FooterLink({
  href,
  external = false,
  children,
}: {
  href: string | null;
  external?: boolean;
  children: ReactNode;
}) {
  if (!href) return <span className="text-paper">{children}</span>;
  return (
    <a href={href} className={LINK_CLASS} {...(external && { target: "_blank", rel: "noopener" })}>
      {children}
      {external && <span className="sr-only"> (se abre en una pestaña nueva)</span>}
    </a>
  );
}

function AppButton({ href, children }: { href: string | null; children: ReactNode }) {
  const className =
    "inline-flex h-[34px] items-center border border-line-dark px-3 text-paper transition-colors duration-300 ease-standard";
  if (!href) return <span className={className}>{children}</span>;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      className={`${className} hover:border-paper hover:text-paper`}
    >
      {children}
      <span className="sr-only"> (se abre en una pestaña nueva)</span>
    </a>
  );
}

/** 08-footer: estático, fondo negro. */
export async function Footer() {
  const year = await currentYear();

  return (
    <footer className="flex flex-col gap-9 bg-ink px-page pt-[clamp(36px,4vw,56px)] pb-6 text-[9px] font-normal tracking-[0.24em] text-paper">
      <div className="flex flex-wrap items-start justify-between gap-x-10 gap-y-7">
        <Image
          src="/assets/brand/emer-logo-white.webp"
          alt="Emer"
          width={110}
          height={40}
          className="h-10 w-auto"
        />

        <nav aria-label="Pie" className="flex gap-12">
          <div className="flex flex-col gap-2.5">
            <p className="text-muted-dark">EXPLORAR</p>
            <FooterLink href="#marcas">MARCAS</FooterLink>
            <FooterLink href={LINKS.marketplace}>MARKETPLACE</FooterLink>
            <FooterLink href={LINKS.stores}>TIENDAS</FooterLink>
          </div>
          <div className="flex flex-col gap-2.5">
            <p className="text-muted-dark">EMER</p>
            <FooterLink href={LINKS.forBrands}>PARA MARCAS</FooterLink>
            <FooterLink href={LINKS.privacy}>PRIVACIDAD</FooterLink>
            <FooterLink href={LINKS.terms}>TÉRMINOS</FooterLink>
          </div>
        </nav>

        <div className="flex flex-col gap-2.5">
          <p className="text-muted-dark">TAMBIÉN EN EL MÓVIL</p>
          <div className="flex gap-2">
            <AppButton href={LINKS.appStore}>
              APP STORE <span aria-hidden="true">&nbsp;↗</span>
            </AppButton>
            <AppButton href={LINKS.googlePlay}>
              GOOGLE PLAY <span aria-hidden="true">&nbsp;↗</span>
            </AppButton>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap justify-between gap-2 border-t border-line-darker pt-3.5 text-[8px] tracking-[0.22em] text-muted-dark">
        <span>MARCAS PEQUEÑAS, UN SOLO SITIO</span>
        <span>© {year} EMER</span>
      </div>
    </footer>
  );
}
