"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Vuelve a pedir el render del servidor cada `seconds`.
 *
 * Es el reemplazo deliberado de Supabase Realtime para «quién está dentro»
 * (§6 de la especificación; decisión revisada 2026-08-09). Realtime abriría un
 * WebSocket por pestaña y evaluaría RLS por suscriptor en cada evento, y las
 * conexiones concurrentes crecen con INQUILINOS, no con uso. Aquí basta una
 * petición por minuto, y sólo en la pantalla que recepción deja abierta.
 *
 * Se pausa cuando la pestaña no está visible: una tablet olvidada encendida no
 * tiene por qué seguir pidiendo.
 */
export function AutoRefresh({ seconds = 60 }: { seconds?: number }) {
  const router = useRouter();

  useEffect(() => {
    const ms = Math.max(seconds, 10) * 1000;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, ms);

    // Al volver a la pestaña, refrescar de inmediato en vez de esperar el turno.
    const onVisible = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router, seconds]);

  return null;
}
