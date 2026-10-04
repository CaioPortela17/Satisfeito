import { createClient } from "@/lib/supabase/server";

// Página temporária só para testar a conexão com o Supabase.
// Será substituída quando criarmos o login (Etapa 2).
export default async function Home() {
  const supabase = await createClient();

  // Tentamos ler uma linha da tabela "empresas".
  // Sem login, o banco nega o acesso (erro 42501) — prova de que o RLS funciona
  // e de que o Supabase respondeu, ou seja, a conexão está ok.
  // (Não usamos head: true porque aí o erro volta sem o código.)
  const { error } = await supabase.from("empresas").select("id").limit(1);

  const conectado = !error || error.code === "42501";

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-3xl font-bold">Satisfeito</h1>
      {conectado ? (
        <p className="text-lg text-green-700">Conectado ao Supabase ✅</p>
      ) : (
        <p className="text-lg text-red-700">Erro ao conectar: {error?.message}</p>
      )}
      {error?.code === "42501" && (
        <p className="text-sm text-zinc-600">
          Visitante sem login não pode ver as empresas — o RLS está protegendo os dados.
        </p>
      )}
    </main>
  );
}
