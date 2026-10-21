"use client";

// Último recurso: aparece quando o próprio layout principal quebra. Precisa trazer <html> e <body>
// e não pode depender de nada do resto do app (estilos, componentes), então usa estilo simples.
export default function ErroGlobal({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#14b8a6", color: "#2a1f2d" }}>
        <main style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
          <div role="alert" style={{ background: "#fff", borderRadius: 24, padding: 32, maxWidth: 420, textAlign: "center" }}>
            <h1 style={{ fontSize: 26, margin: "0 0 8px" }}>Algo deu errado por aqui</h1>
            <p style={{ margin: "0 0 24px", color: "#6b5f6e" }}>Não foi culpa sua. Tente de novo em instantes.</p>
            <button
              type="button"
              onClick={() => retry()}
              style={{ minHeight: 44, padding: "0 24px", borderRadius: 999, border: 0, background: "#2a1f2d", color: "#fff8f3", fontSize: 16, fontWeight: 600, cursor: "pointer" }}
            >
              Tentar de novo
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
