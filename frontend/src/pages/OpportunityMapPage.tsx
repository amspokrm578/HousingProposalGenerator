import { useMemo, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Map, { Source, Layer } from "react-map-gl/maplibre";
import type { MapRef } from "react-map-gl";
import type { MapLayerMouseEvent } from "maplibre-gl";
import { skipToken } from "@reduxjs/toolkit/query";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  useGetNeighborhoodMapDataQuery,
  useGetOpportunityParcelsQuery,
} from "../store/api/apiSlice";
import type {
  NeighborhoodMapData,
  OpportunityParcel,
  ParcelType,
} from "../types/models";

const MAP_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

const PLUTO_BOROUGH_TO_CODE: Record<string, string> = {
  mn: "MN", manhattan: "MN", "1": "MN",
  bx: "BX", bronx: "BX", "2": "BX",
  bk: "BK", brooklyn: "BK", "3": "BK",
  qn: "QN", queens: "QN", "4": "QN",
  si: "SI", "staten island": "SI", statenisland: "SI", "5": "SI",
};

function normalizeBoroughCode(raw: string | null): string {
  if (!raw) return "";
  return PLUTO_BOROUGH_TO_CODE[raw.toLowerCase().trim()] ?? "";
}
const PARCEL_MIN_ZOOM = 13;

const PARCEL_TYPE_CONFIG: Record<ParcelType, { label: string; color: string }> =
  {
    vacant: { label: "Vacant Land", color: "#22d3ee" },
    parking: { label: "Parking / Garage", color: "#a78bfa" },
    underbuilt: { label: "Underbuilt", color: "#fbbf24" },
    lowrise: { label: "Low-rise on High-FAR Zone", color: "#34d399" },
  };

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

interface ViewportBounds {
  north: number;
  south: number;
  east: number;
  west: number;
  zoom: number;
}

const LAYERS: MapLayer[] = [
  {
    id: "zoning-residential",
    label: "Residential Zoning",
    enabled: true,
    filterKey: "zoning_has_residential",
  },
  {
    id: "zoning-commercial",
    label: "Commercial Zoning",
    enabled: true,
    filterKey: "zoning_has_commercial",
  },
  {
    id: "zoning-mixed",
    label: "Mixed Use",
    enabled: true,
    filterKey: "zoning_has_mixed",
  },
  {
    id: "approval-rates",
    label: "Historical Approval Rates",
    enabled: false,
    filterKey: "approval_rate_pct",
  },
  {
    id: "demand-score",
    label: "Housing Demand Score",
    enabled: false,
    filterKey: "demand_score",
  },
  {
    id: "infrastructure",
    label: "Infrastructure (Transit)",
    enabled: false,
    filterKey: "infrastructure_score",
  },
];

function passesLayerFilters(n: NeighborhoodMapData, layers: MapLayer[]): boolean {
  const zoningLayers = layers.filter(
    (l) =>
      l.enabled &&
      ["zoning_has_residential", "zoning_has_commercial", "zoning_has_mixed"].includes(
        l.filterKey
      )
  );
  const dataLayers = layers.filter(
    (l) =>
      l.enabled &&
      ["approval_rate_pct", "demand_score", "infrastructure_score"].includes(l.filterKey)
  );
  if (zoningLayers.length > 0 && !zoningLayers.some((l) => n[l.filterKey] === true))
    return false;
  if (dataLayers.length > 0 && !dataLayers.every((l) => n[l.filterKey] != null))
    return false;
  return true;
}

function getPointColor(n: NeighborhoodMapData, layers: MapLayer[]): string {
  const demandOn = layers.find((l) => l.id === "demand-score")?.enabled;
  const approvalOn = layers.find((l) => l.id === "approval-rates")?.enabled;
  const infraOn = layers.find((l) => l.id === "infrastructure")?.enabled;
  if (demandOn && n.demand_score != null)
    return n.demand_score >= 75 ? "#22d3ee" : n.demand_score >= 50 ? "#34d399" : "#a78bfa";
  if (approvalOn && n.approval_rate_pct != null)
    return n.approval_rate_pct >= 80
      ? "#22d3ee"
      : n.approval_rate_pct >= 50
      ? "#34d399"
      : "#f472b6";
  if (infraOn && n.infrastructure_score != null)
    return n.infrastructure_score >= 70
      ? "#22d3ee"
      : n.infrastructure_score >= 40
      ? "#34d399"
      : "#fbbf24";
  return "#22d3ee";
}

function classifyParcel(props: Record<string, unknown>): ParcelType {
  if (props.landuse === "11") return "vacant";
  if (props.landuse === "16") return "parking";
  const residfar = parseFloat(String(props.residfar ?? "0"));
  const builtfar = parseFloat(String(props.builtfar ?? "0"));
  if (residfar > 0 && !isNaN(builtfar) && builtfar < residfar * 0.5) return "underbuilt";
  return "lowrise";
}

export default function OpportunityMapPage() {
  const navigate = useNavigate();
  const mapRef = useRef<MapRef>(null);
  const [layers, setLayers] = useState(LAYERS);
  const [parcelLayerEnabled, setParcelLayerEnabled] = useState(false);
  const [layersOpen, setLayersOpen] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [selectedParcel, setSelectedParcel] = useState<OpportunityParcel | null>(null);
  const [viewportBounds, setViewportBounds] = useState<ViewportBounds | null>(null);

  const { data: mapData = [], isLoading } = useGetNeighborhoodMapDataQuery();

  const handleStartProposal = useCallback((parcel: OpportunityParcel) => {
    const params = new URLSearchParams();
    if (parcel.lotarea) params.set("lot_size", parcel.lotarea);
    if (parcel.address) params.set("address", parcel.address);
    const code = normalizeBoroughCode(parcel.borough);
    if (code) params.set("borough", code);
    if (parcel._lat != null) params.set("lat", String(parcel._lat));
    if (parcel._lng != null) params.set("lng", String(parcel._lng));
    navigate(`/proposals/new?${params.toString()}`);
  }, [navigate]);

  const captureViewport = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const bounds = map.getBounds();
    if (!bounds) return;
    setViewportBounds({
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      west: bounds.getWest(),
      zoom: map.getZoom(),
    });
  }, []);

  const parcelQueryArg =
    parcelLayerEnabled && viewportBounds && viewportBounds.zoom >= PARCEL_MIN_ZOOM
      ? {
          north: viewportBounds.north,
          south: viewportBounds.south,
          east: viewportBounds.east,
          west: viewportBounds.west,
        }
      : skipToken;

  const { data: rawParcelData, isFetching: parcelsFetching } =
    useGetOpportunityParcelsQuery(parcelQueryArg);

  const parcelGeoJSON = useMemo(() => {
    const features = rawParcelData?.features;
    if (!features) return null;
    return {
      ...rawParcelData,
      features: features.map((f: any) => ({
        ...f,
        properties: {
          ...f.properties,
          _parcel_type: classifyParcel(f.properties ?? {}),
        },
      })),
    };
  }, [rawParcelData]);

  const parcelCount = parcelGeoJSON?.features?.length ?? 0;

  const toggleLayer = (id: string) =>
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, enabled: !l.enabled } : l)));

  const filteredData = useMemo(
    () => mapData.filter((n) => passesLayerFilters(n, layers)),
    [mapData, layers]
  );

  const neighborhoodGeoJSON = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: filteredData.map((n) => ({
        type: "Feature" as const,
        properties: { ...n, _color: getPointColor(n, layers) },
        geometry: {
          type: "Point" as const,
          coordinates: [parseFloat(n.longitude) || -73.98, parseFloat(n.latitude) || 40.75],
        },
      })),
    }),
    [filteredData, layers]
  );

  const onMapLoad = useCallback(() => captureViewport(), [captureViewport]);
  const onMoveEnd = useCallback(() => captureViewport(), [captureViewport]);

  const onMouseMove = useCallback((e: MapLayerMouseEvent) => {
    const feat = e.features?.[0];
    if (feat?.layer?.id === "neighborhood-points" && feat.properties) {
      const props = feat.properties as any;
      const data: NeighborhoodMapData = {
        ...props,
        zoning_codes:
          typeof props.zoning_codes === "string"
            ? JSON.parse(props.zoning_codes)
            : (props.zoning_codes ?? []),
      };
      setTooltip({ x: e.point.x, y: e.point.y, data });
    } else {
      setTooltip(null);
    }
  }, []);

  const onMouseLeave = useCallback(() => setTooltip(null), []);

  const onMapClick = useCallback((e: MapLayerMouseEvent) => {
    const feat = e.features?.[0];
    if (feat?.layer?.id === "parcels-points") {
      setSelectedParcel(feat.properties as OpportunityParcel);
    } else {
      setSelectedParcel(null);
    }
  }, []);

  const showZoomHint =
    parcelLayerEnabled && viewportBounds && viewportBounds.zoom < PARCEL_MIN_ZOOM;

  return (
    <div className="relative h-[calc(100vh-4rem)] w-full">
      {isLoading && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="h-12 w-12 animate-pulse rounded-xl bg-cyan-500/40" />
        </div>
      )}

      <Map
        ref={mapRef}
        initialViewState={{ longitude: -73.9857, latitude: 40.7484, zoom: 10, pitch: 45 }}
        style={{ width: "100%", height: "100%" }}
        mapStyle={MAP_STYLE}
        interactiveLayerIds={["neighborhood-points", "parcels-points"]}
        onLoad={onMapLoad}
        onMoveEnd={onMoveEnd}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        onClick={onMapClick}
      >
        {filteredData.length > 0 && (
          <Source id="neighborhoods" type="geojson" data={neighborhoodGeoJSON}>
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

        {parcelGeoJSON && parcelLayerEnabled && (
          <Source id="parcels" type="geojson" data={parcelGeoJSON}>
            <Layer
              id="parcels-points"
              type="circle"
              minzoom={PARCEL_MIN_ZOOM}
              paint={{
                "circle-radius": [
                  "interpolate", ["linear"], ["zoom"],
                  13, 4,
                  16, 9,
                ],
                "circle-color": [
                  "match", ["get", "_parcel_type"],
                  "vacant",    "#22d3ee",
                  "parking",   "#a78bfa",
                  "underbuilt","#fbbf24",
                  "lowrise",   "#34d399",
                  "#ffffff",
                ],
                "circle-opacity": 0.85,
                "circle-stroke-width": 1.5,
                "circle-stroke-color": "#0f172a",
              }}
            />
          </Source>
        )}
      </Map>

      {/* Desktop layers panel */}
      <motion.aside
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="absolute left-4 top-4 z-10 hidden w-64 rounded-2xl border border-white/10 bg-slate-900/80 p-4 backdrop-blur-xl lg:block"
      >
        <h3 className="mb-1 text-sm font-semibold text-white">Data Layers & Filters</h3>
        <p className="mb-3 text-xs text-slate-400">
          {filteredData.length} of {mapData.length} neighborhoods
        </p>
        <div className="space-y-1">
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

        <div className="mt-3 border-t border-white/10 pt-3">
          <label className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 transition-colors hover:bg-white/5">
            <input
              type="checkbox"
              checked={parcelLayerEnabled}
              onChange={() => {
                setParcelLayerEnabled((v) => !v);
                setSelectedParcel(null);
              }}
              className="h-4 w-4 rounded border-slate-500 bg-slate-800 text-cyan-500 focus:ring-cyan-500"
            />
            <span className="text-sm font-medium text-slate-200">Opportunity Parcels</span>
          </label>
          {parcelLayerEnabled && (
            <div className="mt-2 space-y-1 pl-3">
              {(Object.entries(PARCEL_TYPE_CONFIG) as [ParcelType, { label: string; color: string }][]).map(
                ([, cfg]) => (
                  <div key={cfg.label} className="flex items-center gap-2 px-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-sm"
                      style={{ backgroundColor: cfg.color }}
                    />
                    <span className="text-xs text-slate-400">{cfg.label}</span>
                  </div>
                )
              )}
              {parcelsFetching && (
                <p className="mt-1 pl-2 text-xs text-slate-500">Loading parcels…</p>
              )}
              {!parcelsFetching && parcelCount > 0 && (
                <p className="mt-1 pl-2 text-xs text-slate-500">
                  {parcelCount} parcels shown
                </p>
              )}
            </div>
          )}
        </div>
      </motion.aside>

      {/* Mobile bottom sheet */}
      <div className="fixed bottom-4 left-4 right-4 z-10 lg:hidden">
        <button
          onClick={() => setLayersOpen(!layersOpen)}
          className="w-full rounded-xl border border-white/10 bg-slate-900/90 px-4 py-3 text-sm font-medium text-white backdrop-blur-xl"
        >
          {layersOpen ? "Hide Layers" : "Show Data Layers"} ({filteredData.length}/
          {mapData.length})
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
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border-t border-white/10 px-3 py-2 pt-3 mt-2">
                <input
                  type="checkbox"
                  checked={parcelLayerEnabled}
                  onChange={() => {
                    setParcelLayerEnabled((v) => !v);
                    setSelectedParcel(null);
                  }}
                  className="h-4 w-4 rounded border-slate-500 bg-slate-800 text-cyan-500"
                />
                <span className="text-sm font-medium text-slate-200">Opportunity Parcels</span>
              </label>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Neighbourhood tooltip */}
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
              <Row label="Area" value={`${(parseFloat(tooltip.data.area_sq_miles) * 27878400).toLocaleString()} sq ft`} />
              {tooltip.data.zoning_codes?.length > 0 && (
                <Row label="Zoning" value={tooltip.data.zoning_codes.join(", ")} />
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
                <Row label="Transit Score" value={String(tooltip.data.infrastructure_score)} />
              )}
              {tooltip.data.median_rent && (
                <Row label="Median Rent" value={`$${parseFloat(tooltip.data.median_rent).toLocaleString()}/mo`} />
              )}
            </dl>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Parcel detail panel */}
      <AnimatePresence>
        {selectedParcel && (
          <ParcelDetailPanel
            parcel={selectedParcel}
            onClose={() => setSelectedParcel(null)}
            onStartProposal={handleStartProposal}
          />
        )}
      </AnimatePresence>

      {/* Zoom hint */}
      <AnimatePresence>
        {showZoomHint && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="absolute bottom-6 left-1/2 z-20 -translate-x-1/2 rounded-xl border border-white/10 bg-slate-900/90 px-4 py-2 text-xs text-slate-300 backdrop-blur-xl"
          >
            Zoom in to load opportunity parcels
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ParcelDetailPanel({
  parcel,
  onClose,
  onStartProposal,
}: {
  parcel: OpportunityParcel;
  onClose: () => void;
  onStartProposal: (parcel: OpportunityParcel) => void;
}) {
  const cfg = PARCEL_TYPE_CONFIG[parcel._parcel_type];
  const residfar = parcel.residfar ? parseFloat(parcel.residfar) : null;
  const builtfar = parcel.builtfar ? parseFloat(parcel.builtfar) : null;
  const lotArea = parcel.lotarea
    ? parseInt(parcel.lotarea, 10).toLocaleString()
    : "—";

  return (
    <motion.aside
      initial={{ x: 320, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 320, opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="absolute right-4 top-4 z-20 w-72 rounded-2xl border border-white/10 bg-slate-900/95 p-5 shadow-2xl backdrop-blur-xl"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <span
            className="inline-block rounded-md px-2 py-0.5 text-xs font-semibold"
            style={{ backgroundColor: cfg.color + "33", color: cfg.color }}
          >
            {cfg.label}
          </span>
          <h3 className="mt-2 text-sm font-semibold leading-snug text-white">
            {parcel.address || "No address on file"}
          </h3>
        </div>
        <button
          onClick={onClose}
          className="shrink-0 text-xl leading-none text-slate-400 hover:text-white"
        >
          ×
        </button>
      </div>

      <dl className="mt-4 space-y-2">
        <Row label="Owner" value={parcel.ownername || "—"} />
        <Row label="Lot area" value={`${lotArea} sq ft`} />
        <Row label="Zoning" value={parcel.zonedist1 || "—"} />
        <Row label="Building class" value={parcel.bldgclass || "—"} />
        {residfar !== null && <Row label="Allowed FAR" value={residfar.toFixed(2)} />}
        {builtfar !== null && residfar !== null && residfar > 0 && (
          <Row
            label="Built FAR"
            value={`${builtfar.toFixed(2)} (${((builtfar / residfar) * 100).toFixed(0)}% of max)`}
          />
        )}
        {parcel.numfloors && <Row label="Floors" value={parcel.numfloors} />}
        {parcel.yearbuilt && parcel.yearbuilt !== "0" && (
          <Row label="Year built" value={parcel.yearbuilt} />
        )}
        <Row label="BBL" value={parcel.bbl || "—"} />
      </dl>

      <button
        onClick={() => onStartProposal(parcel)}
        className="mt-5 w-full rounded-lg bg-gradient-to-r from-indigo-500 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:from-indigo-400 hover:to-cyan-400"
      >
        Start Proposal →
      </button>
    </motion.aside>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="shrink-0 text-sm text-slate-400">{label}</dt>
      <dd className="text-right text-xs text-slate-200">{value}</dd>
    </div>
  );
}
