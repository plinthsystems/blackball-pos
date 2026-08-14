"use client";

import type { LiveTableCardData } from "../types";
import { useRouter } from "next/navigation";
import { updateTableStatusAction } from "../actions";
import { Button } from "@/components/ui/button";

export function TableStatusMenu({ table }: { table: LiveTableCardData }) {
  const router = useRouter();

  if (table.status !== "RESERVED") {
    return null;
  }

  return (
    <Button
      type="button"
      variant="ghost"
      className="h-9 px-3"
      onClick={async () => {
        const result = await updateTableStatusAction({ tableId: table.id, status: "AVAILABLE" });
        if (result.ok) {
          router.refresh();
        }
      }}
    >
      Set available
    </Button>
  );
}
