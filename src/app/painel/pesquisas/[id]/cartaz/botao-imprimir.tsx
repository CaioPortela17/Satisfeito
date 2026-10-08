"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BotaoImprimir() {
  return (
    <Button type="button" className="min-h-11 rounded-full px-5 print:hidden" onClick={() => window.print()}>
      <Printer aria-hidden="true" />
      Imprimir
    </Button>
  );
}
