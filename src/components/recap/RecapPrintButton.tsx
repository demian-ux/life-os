"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui";

export function RecapPrintButton() {
  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      onClick={() => window.print()}
    >
      <Printer className="h-3.5 w-3.5" />
      Print
    </Button>
  );
}
