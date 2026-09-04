import { LinkButton } from "@/components/ui";
import { BrandSymbol } from "@/components/brand/Brand";

export default function NotFound() {
  return (
    <main className="flex-1 flex items-center justify-center p-6 text-center">
      <div className="animate-rise">
        <BrandSymbol className="h-12 mx-auto opacity-50" sizes="96px" />
        <h1 className="mt-5 text-xl font-bold">Página não encontrada</h1>
        <p className="mt-2 text-ink-500">O endereço pode estar errado ou você não tem acesso a este registro.</p>
        <div className="mt-6"><LinkButton href="/">Ir para o início</LinkButton></div>
      </div>
    </main>
  );
}
