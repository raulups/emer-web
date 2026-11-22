"use client";

import { type FormEvent, useEffect, useId, useState } from "react";
import button from "@/components/ui/button.module.css";
import { track } from "@/lib/analytics";
import { cleanEmail, EMAIL_MAX, validEmail, WAITLIST_KEY } from "@/lib/waitlist";
import styles from "./waitlist-form.module.css";

type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "done"; email: string; created: boolean }
  | { kind: "error"; message: string };

type Envelope = { success: boolean; data: { created: boolean } | null; error: string | null };

function remembered(): string | null {
  try {
    return localStorage.getItem(WAITLIST_KEY);
  } catch {
    return null;
  }
}

function remember(email: string) {
  try {
    localStorage.setItem(WAITLIST_KEY, email);
  } catch {
    // Almacenamiento bloqueado: la próxima vez se vuelve a ver el formulario.
  }
}

/**
 * «Avísame cuando salga»: guarda el email en la lista de espera de la app (`/api/waitlist` →
 * backend). Si ya se apuntó desde este navegador, solo lo recuerda.
 */
export function WaitlistForm() {
  const id = useId();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  useEffect(() => {
    const saved = remembered();
    if (saved) setStatus({ kind: "done", email: saved, created: false });
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (status.kind === "sending") return;
    if (!validEmail(email)) {
      setStatus({ kind: "error", message: "Revisa el email: parece que no está bien escrito." });
      return;
    }
    const clean = cleanEmail(email);
    setStatus({ kind: "sending" });
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: clean }),
      });
      const body = (await res.json().catch(() => null)) as Envelope | null;
      if (!res.ok || !body?.success) {
        setStatus({
          kind: "error",
          message: body?.error ?? "No se ha podido guardar. Inténtalo de nuevo.",
        });
        return;
      }
      remember(clean);
      track("app_waitlist_join", { created: body.data?.created ?? true });
      setStatus({ kind: "done", email: clean, created: body.data?.created ?? true });
    } catch {
      setStatus({ kind: "error", message: "Sin conexión. Inténtalo de nuevo." });
    }
  };

  if (status.kind === "done") {
    return (
      <p className={styles.done} role="status">
        {status.created ? "LISTO. " : "YA ESTÁS EN LA LISTA. "}
        <span className={styles.doneText}>
          Te escribiremos a <strong>{status.email}</strong> cuando la app esté publicada.
        </span>
      </p>
    );
  }

  const errorId = `${id}-error`;
  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <label htmlFor={`${id}-email`} className={styles.label}>
        AVÍSAME CUANDO SALGA
      </label>
      <div className={styles.row}>
        <input
          id={`${id}-email`}
          className={styles.input}
          type="email"
          name="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="tu@email.com"
          maxLength={EMAIL_MAX}
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            if (status.kind === "error") setStatus({ kind: "idle" });
          }}
          aria-invalid={status.kind === "error" || undefined}
          aria-describedby={status.kind === "error" ? errorId : `${id}-note`}
          disabled={status.kind === "sending"}
          required
        />
        <button
          type="submit"
          className={`${button.box} ${styles.submit}`}
          disabled={status.kind === "sending"}
        >
          {status.kind === "sending" ? "ENVIANDO" : "AVÍSAME"}
        </button>
      </div>
      {status.kind === "error" ? (
        <p id={errorId} className={styles.error} role="alert">
          {status.message}
        </p>
      ) : (
        <p id={`${id}-note`} className={styles.note}>
          Solo lo usaremos para avisarte del lanzamiento.
        </p>
      )}
    </form>
  );
}
