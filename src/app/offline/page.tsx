import { BrandSymbol } from "@/components/brand/Brand";

export default function OfflinePage() {
  return (
    <main className="flex-1 flex items-center justify-center p-6 text-center">
      <div>
        <BrandSymbol className="h-14 mx-auto opacity-80" />
        <h1 className="mt-5 text-xl font-bold">Você está sem conexão</h1>
        <p className="mt-2 text-ink-500">Conecte-se à internet para ver as informações mais recentes.</p>
      </div>
    </main>
  );
}
