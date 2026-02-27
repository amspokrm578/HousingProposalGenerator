export interface Borough {
  id: number;
  name: string;
  code: string;
  neighborhood_count: number;
}

export interface NeighborhoodSummary {
  id: number;
  name: string;
  borough_name: string;
  borough_code: string;
  latitude: string;
  longitude: string;
  area_sq_miles: string;
  proposal_count: number;
}

export interface ZoningDistrict {
  id: number;
  code: string;
  category: string;
  max_far: string;
  max_height_ft: number;
  residential_allowed: boolean;
}

export interface MarketDataEntry {
  id: number;
  period: string;
  median_sale_price: string;
  median_rent: string;
  vacancy_rate_pct: string;
  permits_issued: number;
}

export interface DemographicEntry {
  id: number;
  year: number;
  population: number;
  median_income: string;
  population_growth_pct: string;
  transit_score: string;
}

export interface NeighborhoodMapData {
  id: number;
  name: string;
  borough_name: string;
  borough_code: string;
  latitude: string;
  longitude: string;
  area_sq_miles: string;
  proposal_count: number;
  zoning_has_residential: boolean;
  zoning_has_commercial: boolean;
  zoning_has_mixed: boolean;
  zoning_codes: string[];
  approval_rate_pct: number | null;
  demand_score: number;
  infrastructure_score: number | null;
  median_sale_price: string | null;
  median_rent: string | null;
  vacancy_rate_pct: string | null;
}

export interface NeighborhoodDetail extends NeighborhoodSummary {
  borough: Borough;
  zoning_districts: ZoningDistrict[];
  latest_market_data: MarketDataEntry[];
  latest_demographics: DemographicEntry[];
}

export type ProposalStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected";

export const PROPOSAL_STATUS_LABELS: Record<ProposalStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under Review",
  approved: "Approved",
  rejected: "Rejected",
};

export interface ProposalSummary {
  id: number;
  title: string;
  status: ProposalStatus;
  neighborhood_name: string;
  borough_name: string;
  owner_username: string;
  total_units: number;
  lot_size_sqft: string;
  estimated_cost: string | null;
  projected_revenue: string | null;
  feasibility_score: string | null;
  created_at: string;
  updated_at: string;
}

export interface UnitMix {
  id?: number;
  unit_type: "studio" | "1br" | "2br" | "3br" | "4br";
  count: number;
  avg_sqft: string;
  projected_rent: string;
}

export interface FinancialProjection {
  id: number;
  year: number;
  revenue: string;
  expenses: string;
  net_income: string;
  cumulative_roi: string;
}

export interface StatusHistoryEntry {
  id: number;
  old_status: string;
  new_status: string;
  changed_at: string;
  changed_by: string;
}

export interface ProposalDetail extends ProposalSummary {
  description: string;
  neighborhood: NeighborhoodSummary;
  unit_mix: UnitMix[];
  financial_projections: FinancialProjection[];
  status_history: StatusHistoryEntry[];
}

export interface ProposalCreatePayload {
  title: string;
  description?: string;
  neighborhood: number;
  lot_size_sqft: string;
  total_units: number;
  unit_mix: Omit<UnitMix, "id">[];
}

export interface NeighborhoodRanking {
  neighborhood_id: number;
  neighborhood_name: string;
  borough_name: string;
  median_sale_price: string;
  median_rent: string;
  vacancy_rate_pct: string;
  population: number;
  median_income: string;
  transit_score: string;
  development_score: string;
  overall_rank: number;
  quartile: number;
}

export interface DashboardSummary {
  borough_name: string;
  total_proposals: number;
  total_units: number;
  avg_feasibility_score: string | null;
  total_estimated_cost: string;
  total_projected_revenue: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
