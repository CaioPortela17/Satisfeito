import Link from "next/link";
import { Logo } from "@/components/marca/logo";

export default function LayoutAuth({ children }: { children: React.ReactNode }) {
  return (
    // Fundo menta em volta; o cartão branco mantém a leitura fácil onde se digita
    <main className="flex flex-1 flex-col items-center justify-center bg-menta px-4 py-12">
      <Link href="/" className="mb-8 rounded-md" aria-label="Página inicial">
        <Logo className="text-4xl" />
      </Link>
      <div className="w-full max-w-sm rounded-3xl bg-card p-6 shadow-[0_8px_24px_rgba(42,31,45,0.08)] sm:p-8">
        {children}
      </div>
    </main>
  );
}
