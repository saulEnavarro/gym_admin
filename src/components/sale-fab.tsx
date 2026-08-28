"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Acceso rápido al punto de venta desde cualquier pantalla del panel.
 *
 * En mostrador cobrar es lo que más se repite, y llegar al POS por el menú
 * lateral cuesta dos movimientos de mouse cada vez. El botón vive fijo abajo a
 * la derecha y responde también a F2, la tecla que la gente ya asocia con
 * «cobrar» en los sistemas de caja.
 *
 * Se esconde dentro del propio POS: ahí sobra y taparía el resumen del ticket.
 */
export function SaleFab() {
  const pathname = usePathname();
  const router = useRouter();

  const hidden = pathname === "/pos" || pathname.startsWith("/pos/");

  useEffect(() => {
    if (hidden) return;
    function onKeyDown(e: KeyboardEvent) {
      // Sin modificadores: F2 sola. Con Ctrl/Alt/Cmd puede ser un atajo del
      // navegador o del sistema y no nos corresponde secuestrarlo.
      if (e.key !== "F2" || e.ctrlKey || e.altKey || e.metaKey) return;
      e.preventDefault();
      router.push("/pos");
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [hidden, router]);

  if (hidden) return null;

  return (
    <Link
      href="/pos"
      aria-keyshortcuts="F2"
      title="Nueva venta (F2)"
      className={cn(
        "fixed bottom-5 right-5 z-30 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3.5",
        "text-sm font-semibold text-primary-foreground shadow-lg transition-transform",
        "hover:scale-105 hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2",
        "focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      )}
    >
      <ShoppingCart className="h-5 w-5" />
      <span className="hidden sm:inline">Nueva venta</span>
      <span className="hidden rounded bg-black/15 px-1.5 py-0.5 text-[10px] font-medium lg:inline">
        F2
      </span>
    </Link>
  );
}
