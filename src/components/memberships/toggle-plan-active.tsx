"use client";

import { useTransition } from "react";
import { togglePlanActive } from "@/app/(app)/memberships/actions";

export function TogglePlanActive({
  id,
  active,
}: {
  id: string;
  active: boolean;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await togglePlanActive(id, !active);
        })
      }
      className="text-sm font-medium text-primary underline-offset-4 hover:underline disabled:opacity-50"
    >
      {active ? "Desactivar" : "Activar"}
    </button>
  );
}
