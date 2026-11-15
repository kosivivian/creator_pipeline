import Link from "next/link";
import { NavLinks } from "./NavLinks";

export function Shell({ children, todayCount }: { children: React.ReactNode; todayCount?: number }) {
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[212px_1fr]">
      <aside className="hidden md:flex flex-col gap-8 border-r border-line px-5 py-7 sticky top-0 h-dvh">
        <Link href="/" className="font-display text-[1.15rem] font-semibold tracking-tight">
          Creator Pipeline
        </Link>
        <NavLinks todayCount={todayCount} />
        <form action="/auth/signout" method="post" className="mt-auto">
          <button className="btn btn-quiet px-3">Sign out</button>
        </form>
      </aside>
      <main className="px-4 pt-6 pb-28 md:px-10 md:py-9 max-w-[1080px]">{children}</main>
      <nav className="md:hidden fixed bottom-0 inset-x-0 border-t border-line bg-paper/95 backdrop-blur px-2 pb-[env(safe-area-inset-bottom)]">
        <NavLinks todayCount={todayCount} mobile />
      </nav>
    </div>
  );
}
