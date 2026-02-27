import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import Map, { type MapRef } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { Link } from "react-router-dom";
import { AGENT_TICKER_MESSAGES } from "../data/agentTickerMessages";

const MAP_STYLE = "https://demotiles.maplibre.org/style.json";

export default function HeroPage() {
  const mapRef = useRef<MapRef>(null);
  const [tickerIndex, setTickerIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setTickerIndex((i) => (i + 1) % AGENT_TICKER_MESSAGES.length);
    }, 3500);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    let bearing = 0;
    const interval = setInterval(() => {
      bearing = (bearing + 0.02) % 360;
      map.rotateTo(bearing, { duration: 0 });
    }, 50);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950">
      {/* 3D Map Background */}
      <div className="absolute inset-0">
        <Map
          ref={mapRef}
          initialViewState={{
            longitude: -73.9857,
            latitude: 40.7484,
            zoom: 10.5,
            pitch: 55,
            bearing: 0,
          }}
          style={{ width: "100%", height: "100%" }}
          mapStyle={MAP_STYLE}
          attributionControl={false}
          interactive={false}
        />
        {/* Gradient overlay for readability */}
        <div
          className="absolute inset-0 bg-gradient-to-b from-slate-950/60 via-slate-950/40 to-slate-950/90"
          aria-hidden
        />
      </div>

      {/* Content */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 py-24">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-4xl text-center"
        >
          <h1 className="text-5xl font-extrabold tracking-tight text-white sm:text-6xl md:text-7xl lg:text-8xl">
            Navigating NYC Real Estate
            <br />
            <span className="bg-gradient-to-r from-cyan-400 via-emerald-400 to-teal-400 bg-clip-text text-transparent">
              at the Speed of AI
            </span>
          </h1>
          <p className="mt-6 text-lg text-slate-300 sm:text-xl">
            Generate data-driven housing development proposals. Explore high-opportunity
            parcels. Let AI draft compliant documents in seconds.
          </p>
        </motion.div>

        {/* Agent Activity Ticker */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="mt-16 w-full max-w-2xl"
        >
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl">
            <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-mono text-slate-400">
                Agent Activity
              </span>
            </div>
            <div className="px-4 py-3 font-mono text-sm text-emerald-300">
              <motion.span
                key={tickerIndex}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.3 }}
              >
                {AGENT_TICKER_MESSAGES[tickerIndex]}
              </motion.span>
            </div>
          </div>
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="mt-12 flex flex-wrap justify-center gap-4"
        >
          <Link
            to="/map"
            className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-cyan-500/25 transition-all duration-300 hover:scale-105 hover:shadow-cyan-500/40"
          >
            <span className="relative z-10">Explore Opportunity Map</span>
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-emerald-400 opacity-0 transition-opacity group-hover:opacity-100" />
          </Link>
          <Link
            to="/proposals/new"
            className="rounded-xl border border-white/20 bg-white/5 px-8 py-4 text-lg font-semibold text-white backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:bg-white/10 hover:border-white/30"
          >
            Generate Proposal
          </Link>
        </motion.div>

        {/* Quick nav */}
        <motion.nav
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="mt-16 flex gap-6 text-sm"
        >
          <Link
            to="/map"
            className="text-slate-400 transition-colors hover:text-white"
          >
            Map
          </Link>
          <Link
            to="/workspace"
            className="text-slate-400 transition-colors hover:text-white"
          >
            Workspace
          </Link>
          <Link
            to="/dashboard"
            className="text-slate-400 transition-colors hover:text-white"
          >
            Dashboard
          </Link>
          <Link
            to="/proposals"
            className="text-slate-400 transition-colors hover:text-white"
          >
            Proposals
          </Link>
        </motion.nav>
      </div>
    </div>
  );
}
