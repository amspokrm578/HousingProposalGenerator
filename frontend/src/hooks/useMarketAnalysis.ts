import { useMemo } from "react";
import { useGetNeighborhoodRankingsQuery } from "../store/api/apiSlice";
import type { NeighborhoodRanking } from "../types/models";

interface MarketAnalysis {
  rankings: NeighborhoodRanking[];
  topQuartile: NeighborhoodRanking[];
  byBorough: Record<string, NeighborhoodRanking[]>;
  avgScoreByBorough: Record<string, number>;
  isLoading: boolean;
}

export function useMarketAnalysis(): MarketAnalysis {
  const { data: rankings = [], isLoading } = useGetNeighborhoodRankingsQuery();

  const topQuartile = useMemo(
    () => rankings.filter((r) => r.quartile === 1),
    [rankings],
  );

  const byBorough = useMemo(
    () =>
      rankings.reduce<Record<string, NeighborhoodRanking[]>>((acc, r) => {
        (acc[r.borough_name] ??= []).push(r);
        return acc;
      }, {}),
    [rankings],
  );

  const avgScoreByBorough = useMemo(
    () =>
      Object.entries(byBorough).reduce<Record<string, number>>(
        (acc, [borough, items]) => {
          const total = items.reduce(
            (sum, r) => sum + parseFloat(r.development_score),
            0,
          );
          acc[borough] = Math.round((total / items.length) * 100) / 100;
          return acc;
        },
        {},
      ),
    [byBorough],
  );

  return { rankings, topQuartile, byBorough, avgScoreByBorough, isLoading };
}
