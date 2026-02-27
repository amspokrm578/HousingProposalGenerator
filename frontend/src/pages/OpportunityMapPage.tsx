import { useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Map, { Source, Layer } from "react-map-gl/maplibre";
import type { MapLayerMouseEvent } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useGetNeighborhoodMapDataQuery } from "../store/api/apiSlice";
import type { NeighborhoodMapData } from "../types/models";

const MAP_STYLE = "https://demotiles.maplibre.org/style.json";

interface MapLayer {
  id: string;
  label: string;
  enabled: boolean;
  filterKey: keyof Pick<
    NeighborhoodMapData,
    | "zoning_has_residential"
    | "zoning_has_commercial"
    | "zoning_has_mixed"
    | "approval_rate_pct"
    | "demand_score"
    | "infrastructure_score"
  >;
}

interface TooltipData {
  x: number;
  y: number;
  data: NeighborhoodMapData;
}

const LAYERS: MapLayer[] = [
  { id: "zoning-residential", label: "Residential Zoning", enabled: true, filterKey: "zoning_has_residential" },
  { id: "zoning-commercial", label: "Commercial Zoning", enabled: true, filterKey: "zoning_has_commercial" },
  { id: "zoning-mixed", label: "Mixed Use", enabled: true, filterKey: "zoning_has_mixed" },
  { id: "approval-rates", label: "Historical Approval Rates", enabled: false, filterKey: "approval_rate_pct" },
  { id: "demand-score", label: "Housing Demand Score", enabled: false, filterKey: "demand_score" },
  { id: "infrastructure", label: "Infrastructure (Transit)", enabled: false, filterKey: "infrastructure_score" },
];

function passesLayerFilters(
  n: NeighborhoodMapData,
  layers: MapLayer[]
): boolean {
  const zoningLayers = layers.filter(
    (l) => l.enabled && ["zoning_has_residential", "zoning_has_commercial", "zoning_has_mixed"].includes(l.filterKey)
  );
  const dataLayers = layers.filter(
    (l) =>
      l.enabled &&
      ["approval_rate_pct", "demand_score", "infrastructure_score"].includes(l.filterKey)
  );

  if (zoningLayers.length > 0) {
    const hasAnyZoning = zoningLayers.some((l) => n[l.filterKey] === true);
    if (!hasAnyZoning) return false;
  }
  if (dataLayers.length > 0) {
    const passesAll = dataLayers.every((l) => {
      const val = n[l.filterKey];
      return val != null;
    });
    if (!passesAll) return false;
  }
  return true;
}

function getPointColor(
  n: NeighborhoodMapData,
  layers: MapLayer[]
): string {
  const demandOn = layers.find((l) => l.id === "demand-score")?.enabled;
  const approvalOn = layers.find((l) => l.id === "approval-rates")?.enabled;
  const infraOn = layers.find((l) => l.id === "infrastructure")?.enabled;

  if (demandOn && n.demand_score != null) {
    return n.demand_score >= 75 ? "#22d3ee" : n.demand_score >= 50 ? "#34d399" : "#a78bfa";
  }
  if (approvalOn && n.approval_rate_pct != null) {
    return n.approval_rate_pct >= 80 ? "#22d3ee" : n.approval_rate_pct >= 50 ? "#34d399" : "#f472b6";
  }
  if (infraOn && n.infrastructure_score != null) {
    return n.infrastructure_score >= 70 ? "#22d3ee" : n.infrastructure_score >= 40 ? "#34d399" : "#fbbf24";
  }
  return "#22d3ee";
}

export default function OpportunityMapPage() {
  const [layers, setLayers] = useState(LAYERS);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [layersOpen, setLayersOpen] = useState(false);
  const { data: mapData = [], isLoading } = useGetNeighborhoodMapDataQuery();

  const toggleLayer = (id: string) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, enabled: !l.enabled } : l))
    );
  };

  const filteredData = useMemo(() => {
    return mapData.filter((n) => passesLayerFilters(n, layers));
  }, [mapData, layers]);

  const geojson = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: filteredData.map((n) => ({
        type: "Feature" as const,
        properties: {
          ...n,
          _color: getPointColor(n, layers),
        },
        geometry: {
          type: "Point" as const,
          coordinates: [
            parseFloat(n.longitude) || -73.98,
            parseFloat(n.latitude) || 40.75,
          ],
        },
      })),
    }),
    [filteredData, layers]
  );

  const onMouseMove = useCallback(
    (e: MapLayerMouseEvent) => {
      const feat = e.features?.[0];
      if (!feat?.properties) return;
      const props = feat.properties as unknown as NeighborhoodMapData;
      setTooltip({ x: e.point.x, y: e.point.y, data: props });
    },
    []
  );

  const onMouseLeave = useCallback(() => setTooltip(null), []);

  const colorStops = useMemo(() => {
    const colors = [...new Set(filteredData.map((n) => getPointColor(n, layers)))];
    return colors.length > 1
      ? ["match", ["get", "_color"], ...colors.flatMap((c, i) => [c, i]), "#22d3ee"]
      : ["get", "_color"];
  }, [filteredData, layers]);

  return (
    <div className="relative h-[calc(100vh-4rem)] w-full">
      {isLoading && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="h-12 w-12 animate-pulse rounded-xl bg-cyan-500/40" />
        </div>
      )}
      <Map
        initialViewState={{
          longitude: -73.9857,
          latitude: 40.7484,
          zoom: 10,
          pitch: 45,
          bearing: 0,
        }}
        style={{ width: "100%", height: "100%" }}
        mapStyle={MAP_STYLE}
        interactiveLayerIds={["neighborhood-points"]}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
      >
        {filteredData.length > 0 && (
          <Source id="neighborhoods" type="geojson" data={geojson}>
            <Layer
              id="neighborhood-points"
              type="circle"
              paint={{
                "circle-radius": 10,
                "circle-color": ["get", "_color"],
                "circle-stroke-width": 2,
                "circle-stroke-color": "#ffffff",
              }}
            />
          </Source>
        )}
      </Map>

      {/* Floating Layers Panel */}
      <motion.aside
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="absolute left-4 top-4 z-10 hidden w-64 rounded-2xl border border-white/10 bg-slate-900/80 p-4 backdrop-blur-xl lg:block"
      >
        <h3 className="mb-3 text-sm font-semibold text-white">
          Data Layers & Filters
        </h3>
        <p className="mb-3 text-xs text-slate-400">
          Showing {filteredData.length} of {mapData.length} neighborhoods
        </p>
        <div className="space-y-2">
          {layers.map((layer) => (
            <label
              key={layer.id}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 transition-colors hover:bg-white/5"
            >
              <input
                type="checkbox"
                checked={layer.enabled}
                onChange={() => toggleLayer(layer.id)}
                className="h-4 w-4 rounded border-slate-500 bg-slate-800 text-cyan-500 focus:ring-cyan-500"
              />
              <span className="text-sm text-slate-200">{layer.label}</span>
            </label>
          ))}
        </div>
        <div className="mt-4 border-t border-white/10 pt-3">
          <p className="text-xs text-slate-400">
            Enable layers to filter. Colors reflect demand, approval, or transit when those layers are on.
          </p>
        </div>
      </motion.aside>

      {/* Mobile: bottom sheet for layers */}
      <div className="fixed bottom-4 left-4 right-4 z-10 lg:hidden">
        <button
          onClick={() => setLayersOpen(!layersOpen)}
          className="w-full rounded-xl border border-white/10 bg-slate-900/90 px-4 py-3 text-sm font-medium text-white backdrop-blur-xl"
        >
          {layersOpen ? "Hide Layers" : "Show Data Layers"} ({filteredData.length}/{mapData.length})
        </button>
        <AnimatePresence>
          {layersOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-2 overflow-hidden rounded-xl border border-white/10 bg-slate-900/95 p-4 backdrop-blur-xl"
            >
              {layers.map((layer) => (
                <label
                  key={layer.id}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2"
                >
                  <input
                    type="checkbox"
                    checked={layer.enabled}
                    onChange={() => toggleLayer(layer.id)}
                    className="h-4 w-4 rounded border-slate-500 bg-slate-800 text-cyan-500"
                  />
                  <span className="text-sm text-slate-200">{layer.label}</span>
                </label>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Tooltip */}
      <AnimatePresence>
        {tooltip && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="pointer-events-none absolute z-20 rounded-xl border border-white/10 bg-slate-900/95 p-4 shadow-2xl backdrop-blur-xl"
            style={{ left: tooltip.x + 12, top: tooltip.y + 12 }}
          >
            <p className="font-semibold text-white">{tooltip.data.name}</p>
            <p className="text-xs text-slate-400">{tooltip.data.borough_name}</p>
            <dl className="mt-3 space-y-1 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-400">Area</dt>
                <dd className="text-slate-200">
                  {(parseFloat(tooltip.data.area_sq_miles) * 27878400).toLocaleString()} sq ft
                </dd>
              </div>
              {tooltip.data.zoning_codes?.length > 0 && (
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-400">Zoning</dt>
                  <dd className="text-slate-200">{tooltip.data.zoning_codes.join(", ")}</dd>
                </div>
              )}
              {tooltip.data.approval_rate_pct != null && (
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-400">Approval Rate</dt>
                  <dd className="font-medium text-emerald-400">
                    {tooltip.data.approval_rate_pct.toFixed(0)}%
                  </dd>
                </div>
              )}
              <div className="flex justify-between gap-4">
                <dt className="text-slate-400">Demand Score</dt>
                <dd className="font-medium text-cyan-400">{tooltip.data.demand_score}</dd>
              </div>
              {tooltip.data.infrastructure_score != null && (
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-400">Transit Score</dt>
                  <dd className="text-slate-200">{tooltip.data.infrastructure_score}</dd>
                </div>
              )}
              {tooltip.data.median_rent && (
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-400">Median Rent</dt>
                  <dd className="text-slate-200">
                    ${parseFloat(tooltip.data.median_rent).toLocaleString()}/mo
                  </dd>
                </div>
              )}
            </dl>
          </motion.div>
        )}
      </AnimatePresence>

      {!layersOpen && (
        <div className="absolute bottom-24 left-4 right-4 rounded-xl border border-white/10 bg-slate-900/80 px-4 py-2 text-center text-xs text-slate-400 backdrop-blur-xl lg:hidden">
          Tap points for details. Use &quot;Show Data Layers&quot; to filter.
        </div>
      )}
    </div>
  );
}
