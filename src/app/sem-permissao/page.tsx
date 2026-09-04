import { LinkButton } from "@/components/ui";
import { BrandSymbol } from "@/components/brand/Brand";

export default function NoPermissionPage() {
  return (
    <main className="flex-1 flex items-center justify-center p-6 text-center">
      <div>
        <BrandSymbol className="h-12 mx-auto opacity-60" sizes="96px" />
        <h1 className="mt-5 text-xl font-bold">Você não tem permissão para esta área</h1>
        <p className="mt-2 text-ink-500">Se precisar deste acesso, fale com a administração.</p>
        <div className="mt-6"><LinkButton href="/">Ir para o início</LinkButton></div>
      </div>
    </main>
  );
}
