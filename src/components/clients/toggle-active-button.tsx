"use client";

import { useTransition } from "react";
import { Power } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toggleClientActive } from "@/app/(app)/clients/actions";

export function ToggleActiveButton({
  id,
  active,
}: {
  id: string;
  active: boolean;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await toggleClientActive(id, !active);
        })
      }
    >
      <Power className="h-4 w-4" />
      {active ? "Dar de baja" : "Reactivar"}
    </Button>
  );
}
