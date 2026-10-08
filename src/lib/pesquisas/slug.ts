import { z } from "zod";

// Final do link público: /p/<slug>
export const esquemaSlug = z
  .string("Escreva o final do link.")
  .trim()
  .toLowerCase()
  .min(3, "Use pelo menos 3 caracteres.")
  .max(60, "Use no máximo 60 caracteres.")
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use só letras sem acento, números e hífen (ex.: bebelu-centro).");

// "Pão de Açúcar & Cia." → "pao-de-acucar-cia"
export function gerarSlug(nome: string): string {
  const base = nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // tira os acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50)
    .replace(/-+$/, "");
  if (base.length >= 3) return base;
  return base ? `pesquisa-${base}` : "pesquisa";
}

// Se "bebelu" já existir, tenta "bebelu-2", "bebelu-3"…
export function candidatosDeSlug(base: string, quantidade = 20): string[] {
  return Array.from({ length: quantidade }, (_, i) => (i === 0 ? base : `${base}-${i + 1}`));
}
