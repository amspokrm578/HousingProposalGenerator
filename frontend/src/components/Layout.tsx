import { Link, Outlet, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useMemo, useState, useRef } from "react";
import { useAppDispatch, useAppSelector } from "../store/store";
import { selectUi, toggleSidebar, closeSidebar, toggleTheme } from "../store/slices/uiSlice";
import { apiSlice, useGetCurrentUserQuery, useLoginMutation } from "../store/api/apiSlice";

const BASE_NAV_ITEMS = [
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
  const [hasToken, setHasToken] = useState(() => !!localStorage.getItem("authToken"));
  const [showLogin, setShowLogin] = useState(false);
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const loginRef = useRef<HTMLDivElement>(null);

  const [login, { isLoading: loginLoading }] = useLoginMutation();
  const { data: currentUser } = useGetCurrentUserQuery(undefined, {
    skip: !hasToken,
  });

  useEffect(() => {
    if (!showLogin) return;
    function handleClick(e: MouseEvent) {
      if (loginRef.current && !loginRef.current.contains(e.target as Node)) {
        setShowLogin(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showLogin]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError("");
    try {
      const result = await login({ username: loginUsername, password: loginPassword }).unwrap();
      localStorage.setItem("authToken", (result as { token: string }).token);
      setHasToken(true);
      setShowLogin(false);
      setLoginUsername("");
      setLoginPassword("");
    } catch {
      setLoginError("Invalid credentials");
    }
  }

  function handleLogout() {
    localStorage.removeItem("authToken");
    setHasToken(false);
    dispatch(apiSlice.util.resetApiState());
  }
  const navItems = useMemo(() => {
    const items = [...BASE_NAV_ITEMS];
    if (hasToken) {
      items.splice(4, 0, { path: "/pdo/loop", label: "Green-Tape Loop" });
    }
    return items;
  }, [hasToken]);

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
          {navItems.map(({ path, label }) => {
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

        {/* Auth controls */}
        {hasToken ? (
          <div className="ml-2 flex items-center gap-2">
            <span className={`text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
              {currentUser?.username}
            </span>
            <button
              onClick={handleLogout}
              className={`rounded-xl border px-3 py-1.5 text-sm font-medium transition-all hover:scale-105 ${
                theme === "dark"
                  ? "border-slate-600 text-slate-400 hover:bg-slate-800"
                  : "border-slate-300 text-slate-600 hover:bg-slate-100"
              }`}
            >
              Sign Out
            </button>
          </div>
        ) : (
          <div className="relative ml-2" ref={loginRef}>
            <button
              onClick={() => setShowLogin(!showLogin)}
              className={`rounded-xl border px-3 py-1.5 text-sm font-medium transition-all hover:scale-105 ${
                theme === "dark"
                  ? "border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
                  : "border-indigo-300 text-indigo-600 hover:bg-indigo-50"
              }`}
            >
              Sign In
            </button>
            <AnimatePresence>
              {showLogin && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className={`absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border p-4 shadow-xl ${
                    theme === "dark"
                      ? "border-slate-700 bg-slate-900"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <form onSubmit={handleLogin} className="flex flex-col gap-3">
                    <p className={`text-xs font-semibold uppercase tracking-wider ${theme === "dark" ? "text-slate-500" : "text-slate-400"}`}>
                      Sign In
                    </p>
                    {loginError && (
                      <p className="text-xs text-red-400">{loginError}</p>
                    )}
                    <input
                      type="text"
                      placeholder="Username"
                      value={loginUsername}
                      onChange={e => setLoginUsername(e.target.value)}
                      autoComplete="username"
                      className={`rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 ${
                        theme === "dark"
                          ? "border-slate-700 bg-slate-800 text-slate-100 placeholder-slate-500 focus:ring-cyan-500/30"
                          : "border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:ring-indigo-300"
                      }`}
                    />
                    <input
                      type="password"
                      placeholder="Password"
                      value={loginPassword}
                      onChange={e => setLoginPassword(e.target.value)}
                      autoComplete="current-password"
                      className={`rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 ${
                        theme === "dark"
                          ? "border-slate-700 bg-slate-800 text-slate-100 placeholder-slate-500 focus:ring-cyan-500/30"
                          : "border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:ring-indigo-300"
                      }`}
                    />
                    <button
                      type="submit"
                      disabled={loginLoading}
                      className="rounded-lg bg-gradient-to-r from-indigo-500 to-cyan-500 px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                    >
                      {loginLoading ? "Signing in…" : "Sign In"}
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
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
              {navItems.map(({ path, label }) => {
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
