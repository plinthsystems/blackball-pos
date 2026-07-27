"use client";

import type { LiveTableCardData } from "../types";
import { updateTableStatusAction } from "../actions";
import { Button } from "@/components/ui/button";

export function TableStatusMenu({ table }: { table: LiveTableCardData }) {
  if (table.status === "OCCUPIED") {
    return null;
  }

  const next = table.status === "AVAILABLE" ? "BLOCKED" : "AVAILABLE";
  return (
    <Button
      type="button"
      variant="ghost"
      className="h-9 px-3"
      onClick={() => updateTableStatusAction({ tableId: table.id, status: next })}
    >
      {next === "BLOCKED" ? "Block" : "Set available"}
    </Button>
  );
}
