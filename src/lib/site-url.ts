// Endereço público do site, usado nos links dos e-mails do Supabase.
// Em produção, NEXT_PUBLIC_SITE_URL terá o domínio real (ex.: https://satisfeito.com.br).
export function urlDoSite(caminho: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return new URL(caminho, base).toString();
}
