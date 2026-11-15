"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Today" },
  { href: "/pipeline", label: "Pipeline" },
  { href: "/leads", label: "Leads" },
  { href: "/ebooks", label: "E-books" },
];

export function NavLinks({ todayCount, mobile }: { todayCount?: number; mobile?: boolean }) {
  const path = usePathname();
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  return (
    <ul className={mobile ? "grid grid-cols-4" : "flex flex-col gap-1"}>
      {LINKS.map((l) => (
        <li key={l.href}>
          <Link
            href={l.href}
            aria-current={active(l.href) ? "page" : undefined}
            className={
              mobile
                ? `flex flex-col items-center py-3 text-[.8rem] font-semibold ${active(l.href) ? "text-green" : "text-muted"}`
                : `flex items-center justify-between rounded-lg px-3 py-2 font-semibold ${
                    active(l.href) ? "bg-green-tint text-green-deep" : "text-muted hover:text-ink"
                  }`
            }
          >
            <span>{l.label}</span>
            {l.href === "/" && !!todayCount && !mobile && (
              <span className="tnum rounded-full bg-green px-2 text-[.75rem] leading-5 text-white">{todayCount}</span>
            )}
            {l.href === "/" && !!todayCount && mobile && (
              <span className="sr-only">, {todayCount} actions</span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
