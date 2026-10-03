import { createClient } from "@/lib/supabase/server";

// Página temporária só para testar a conexão com o Supabase.
// Será substituída quando criarmos o login (Etapa 2).
export default async function Home() {
  const supabase = await createClient();

  // Tentamos contar as linhas da tabela "empresas" (head: true = não traz os dados).
  // Ela ainda não existe, então esperamos o erro PGRST205 ("tabela não encontrada").
  // Receber esse erro já prova que o Supabase respondeu, ou seja, a conexão funciona.
  const { error } = await supabase
    .from("empresas")
    .select("id", { count: "exact", head: true });

  const conectado = !error || error.code === "PGRST205";

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-3xl font-bold">Satisfeito</h1>
      {conectado ? (
        <p className="text-lg text-green-700">Conectado ao Supabase ✅</p>
      ) : (
        <p className="text-lg text-red-700">Erro ao conectar: {error?.message}</p>
      )}
      {error?.code === "PGRST205" && (
        <p className="text-sm text-zinc-500">
          As tabelas ainda não foram criadas — isso vem nas próximas etapas.
        </p>
      )}
    </main>
  );
}
