import { Link, Outlet, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAppDispatch, useAppSelector } from "../store/store";
import { selectUi, toggleSidebar, closeSidebar, toggleTheme } from "../store/slices/uiSlice";
import { useEffect } from "react";

const NAV_ITEMS = [
  { path: "/", label: "Home" },
  { path: "/map", label: "Opportunity Map" },
  { path: "/workspace", label: "Agent Workspace" },
  { path: "/dashboard", label: "Dashboard" },
  { path: "/proposals", label: "Proposals" },
  { path: "/proposals/new", label: "New Proposal" },
];

export default function Layout() {
  const { sidebarOpen, theme } = useAppSelector(selectUi);
  const dispatch = useAppDispatch();
  const location = useLocation();

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.body.classList.toggle("dark", theme === "dark");
    document.body.classList.toggle("light", theme === "light");
  }, [theme]);

  const isHero = location.pathname === "/";

  return (
    <div
      className={`min-h-screen transition-colors ${
        theme === "dark" ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"
      }`}
    >
      {/* Top Bar - Glassmorphism */}
      <header
        className={`sticky top-0 z-30 flex h-16 items-center gap-4 px-6 ${
          theme === "dark"
            ? "border-b border-slate-800/50 bg-slate-900/70 backdrop-blur-xl"
            : "border-b border-slate-200/80 bg-white/70 backdrop-blur-xl"
        }`}
      >
        <button
          onClick={() => dispatch(toggleSidebar())}
          className="rounded-lg p-2 transition-colors hover:bg-white/10 lg:hidden"
          aria-label="Toggle sidebar"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
        <Link to="/" className="text-xl font-bold tracking-tight">
          <span
            className={
              theme === "dark"
                ? "text-cyan-400"
                : "text-indigo-600"
            }
          >
            Green Tape
          </span>
        </Link>

        {/* Desktop nav bar - full viewport */}
        <nav className="ml-8 hidden flex-1 gap-1 lg:flex">
          {NAV_ITEMS.map(({ path, label }) => {
            const active = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? theme === "dark"
                      ? "bg-cyan-500/20 text-cyan-300"
                      : "bg-indigo-100 text-indigo-700"
                    : theme === "dark"
                      ? "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Theme Toggle */}
        <button
          onClick={() => dispatch(toggleTheme())}
          className="ml-auto rounded-xl border p-2 transition-all duration-300 hover:scale-105"
          aria-label="Toggle theme"
          style={{
            borderColor: theme === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
            backgroundColor: theme === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
          }}
        >
          {theme === "dark" ? (
            <svg className="h-5 w-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 001.414 1.414l.707-.707a1 1 0 00-1.414-1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" />
            </svg>
          ) : (
            <svg className="h-5 w-5 text-slate-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
            </svg>
          )}
        </button>
      </header>

      {/* Mobile: backdrop overlay when sidebar is open */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => dispatch(closeSidebar())}
            className="fixed inset-0 top-16 z-10 bg-black/50 backdrop-blur-sm lg:hidden"
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Hero has no sidebar - full bleed */}
      {isHero ? (
        <Outlet />
      ) : (
        <div className="flex">
          {/* Mobile sidebar - slides in from left when hamburger is tapped */}
          <motion.aside
            initial={false}
            animate={{
              x: sidebarOpen ? 0 : "-100%",
            }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className={`fixed inset-y-0 left-0 top-16 z-20 w-60 transform border-r pt-6 lg:hidden ${
              theme === "dark"
                ? "border-slate-800/50 bg-slate-900/95 backdrop-blur-xl"
                : "border-slate-200 bg-white/95 backdrop-blur-xl"
            }`}
          >
            <nav className="flex flex-col gap-1 px-3">
              {NAV_ITEMS.map(({ path, label }) => {
                const active = location.pathname === path;
                return (
                  <Link
                    key={path}
                    to={path}
                    onClick={() => dispatch(closeSidebar())}
                  >
                    <motion.span
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`block rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                        active
                          ? theme === "dark"
                            ? "bg-cyan-500/20 text-cyan-300"
                            : "bg-indigo-100 text-indigo-700"
                          : theme === "dark"
                            ? "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      {label}
                    </motion.span>
                  </Link>
                );
              })}
            </nav>
          </motion.aside>

          {/* Main content */}
          <main className="min-h-[calc(100vh-4rem)] flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>
      )}
    </div>
  );
}
