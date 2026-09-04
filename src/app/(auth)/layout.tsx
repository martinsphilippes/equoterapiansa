export default function AuthLayout({ children }: LayoutProps<"/"> ) {
  return (
    <main className="flex-1 flex items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top,_var(--color-brand-100),_var(--color-sand-50)_60%)]">
      <div className="w-full max-w-sm">{children}</div>
    </main>
  );
}
