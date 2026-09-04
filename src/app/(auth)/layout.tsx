import { BrandLogo, BrandSymbol } from "@/components/brand/Brand";

/**
 * Layout de autenticação: painel azul institucional com a logomarca e o brilho
 * da marca; formulário em superfície clara. No celular vira um herói no topo
 * com o cartão do formulário sobreposto.
 */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="flex-1 flex flex-col md:flex-row min-h-dvh">
      <section className="relative overflow-hidden brand-gradient text-white md:w-[46%] md:min-h-dvh flex flex-col">
        <div className="absolute inset-0 brand-glow" aria-hidden />
        <div className="absolute -right-16 -bottom-10 w-[520px] max-w-[110%] opacity-[0.08] pointer-events-none" aria-hidden>
          <BrandSymbol tone="white" className="w-full h-auto" sizes="520px" />
        </div>
        <div className="relative flex-1 flex flex-col items-center justify-center px-8 pt-12 pb-16 md:py-16">
          <BrandLogo tone="white" className="w-56 md:w-80" sizes="(min-width: 768px) 320px, 224px" priority />
          <p className="mt-6 max-w-xs text-center text-sm md:text-base text-white/80 leading-relaxed">
            Cuidado, organização e evolução de cada praticante em um só lugar.
          </p>
        </div>
        <svg className="md:hidden absolute bottom-0 inset-x-0 w-full text-background" viewBox="0 0 400 24" preserveAspectRatio="none" aria-hidden>
          <path d="M0 24 C 120 0 280 0 400 24 Z" fill="currentColor" />
        </svg>
      </section>
      <section className="flex-1 flex items-start md:items-center justify-center px-5 pb-10 -mt-6 md:mt-0 md:px-12">
        <div className="w-full max-w-sm">{children}</div>
      </section>
    </main>
  );
}
