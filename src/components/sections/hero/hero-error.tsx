"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useTransition } from "react";
import { registerHero } from "@/lib/motion/scroll";
import { trackSection } from "@/lib/motion/sections";

/** Fallo de `/brands`: fondo del hero, «EMER» y reintentar (texto propuesto en el handoff). */
export function HeroError() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const cleanups = [registerHero(el), trackSection(el, "marcas")];
    return () => {
      for (const cleanup of cleanups) cleanup();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      id="marcas"
      data-section="MARCAS"
      data-cursor="hero"
      aria-label="Marcas destacadas"
      className="relative flex h-svh min-h-[560px] items-end bg-hero px-hero pb-16 text-paper"
    >
      <div className="flex flex-col gap-[18px]">
        <h2 className="text-display-l whitespace-nowrap tracking-[0.005em]">Emer</h2>
        <p className="sr-only">No hemos podido cargar las marcas.</p>
        <div className="flex items-center gap-3.5">
          <span aria-hidden="true" className="h-px w-9 bg-paper" />
          <button
            type="button"
            aria-disabled={pending}
            onClick={() => {
              if (!pending) startTransition(() => router.refresh());
            }}
            className="border-b border-transparent pb-[3px] text-[10px] font-normal uppercase tracking-[0.3em] text-paper transition-[border-color] duration-300 hover:border-paper aria-disabled:opacity-60"
          >
            Reintentar <span aria-hidden="true">↻</span>
          </button>
          <span role="status" className="sr-only">
            {pending ? "Cargando las marcas…" : ""}
          </span>
        </div>
      </div>
    </section>
  );
}
