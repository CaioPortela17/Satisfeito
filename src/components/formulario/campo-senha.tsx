"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";

// Campo de senha com botão para mostrar/ocultar o que foi digitado.
// Começa oculto; o botão tem 44 px de área de toque e avisa o leitor de tela se está mostrando.
export function CampoSenha(props: Omit<React.ComponentProps<typeof Input>, "type">) {
  const [visivel, setVisivel] = useState(false);

  return (
    <div className="relative">
      <Input {...props} type={visivel ? "text" : "password"} className="pr-12" />
      <button
        type="button"
        onClick={() => setVisivel((v) => !v)}
        aria-label={visivel ? "Ocultar senha" : "Mostrar senha"}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        {visivel ? <EyeOff className="size-5" aria-hidden="true" /> : <Eye className="size-5" aria-hidden="true" />}
      </button>
    </div>
  );
}
