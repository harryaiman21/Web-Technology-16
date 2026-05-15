import { Boxes, LogOut } from "lucide-react";
import Link from "next/link";

export function Header() {
  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded bg-dhlYellow text-dhlRed">
            <Boxes size={22} />
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-dhlRed">DHL Support Ops</p>
            <h1 className="text-lg font-bold text-ink">Incident Reporting System</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <nav className="flex items-center gap-2 text-sm font-semibold text-stone-600">
            <Link className="rounded-md px-3 py-2 hover:bg-stone-100" href="/">Dashboard</Link>
            <Link className="rounded-md px-3 py-2 hover:bg-stone-100" href="/viewer">Viewer</Link>
          </nav>
          <form action="/auth/signout" method="post">
            <button className="inline-flex items-center gap-2 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-ink hover:bg-stone-50">
              <LogOut size={16} />
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
