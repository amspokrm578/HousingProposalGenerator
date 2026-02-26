import { Link, Outlet, useLocation } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../store/store";
import { selectUi, toggleSidebar } from "../store/slices/uiSlice";

const NAV_ITEMS = [
  { path: "/", label: "Dashboard" },
  { path: "/neighborhoods", label: "Neighborhoods" },
  { path: "/proposals", label: "Proposals" },
  { path: "/proposals/new", label: "New Proposal" },
];

export default function Layout() {
  const { sidebarOpen } = useAppSelector(selectUi);
  const dispatch = useAppDispatch();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-slate-200 bg-white px-6 shadow-sm">
        <button
          onClick={() => dispatch(toggleSidebar())}
          className="rounded-md p-2 hover:bg-slate-100 lg:hidden"
          aria-label="Toggle sidebar"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h1 className="text-xl font-bold tracking-tight text-indigo-700">
          NYC Housing Proposal Generator
        </h1>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          } fixed inset-y-0 left-0 top-16 z-20 w-60 transform border-r border-slate-200 bg-white pt-6 transition-transform duration-200 lg:static lg:translate-x-0`}
        >
          <nav className="flex flex-col gap-1 px-3">
            {NAV_ITEMS.map(({ path, label }) => {
              const active = location.pathname === path;
              return (
                <Link
                  key={path}
                  to={path}
                  className={`rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                    active
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
