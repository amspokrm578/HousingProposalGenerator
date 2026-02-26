import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type {
  Borough,
  DashboardSummary,
  NeighborhoodDetail,
  NeighborhoodRanking,
  NeighborhoodSummary,
  PaginatedResponse,
  ProposalCreatePayload,
  ProposalDetail,
  ProposalSummary,
} from "../../types/models";

const baseQuery = fetchBaseQuery({
  baseUrl: "http://localhost:8000/api/",
  prepareHeaders: (headers) => {
    const token = localStorage.getItem("authToken");
    if (token) {
      headers.set("Authorization", `Token ${token}`);
    }
    return headers;
  },
});

export const apiSlice = createApi({
  reducerPath: "api",
  baseQuery,
  tagTypes: ["Proposal", "Neighborhood", "Borough", "Analytics"],
  endpoints: (builder) => ({
    // --- Boroughs ---
    getBoroughs: builder.query<Borough[], void>({
      query: () => "boroughs/?format=json",
      transformResponse: (res: PaginatedResponse<Borough>) => res.results,
      providesTags: ["Borough"],
    }),

    // --- Neighborhoods ---
    getNeighborhoods: builder.query<
      PaginatedResponse<NeighborhoodSummary>,
      { borough?: string; search?: string; page?: number }
    >({
      query: ({ borough, search, page = 1 }) => {
        const params = new URLSearchParams({ page: String(page) });
        if (borough) params.set("borough", borough);
        if (search) params.set("search", search);
        return `neighborhoods/?${params.toString()}`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.results.map(({ id }) => ({
                type: "Neighborhood" as const,
                id,
              })),
              { type: "Neighborhood", id: "LIST" },
            ]
          : [{ type: "Neighborhood", id: "LIST" }],
    }),

    getNeighborhood: builder.query<NeighborhoodDetail, number>({
      query: (id) => `neighborhoods/${id}/`,
      providesTags: (_result, _err, id) => [{ type: "Neighborhood", id }],
    }),

    // --- Proposals ---
    getProposals: builder.query<
      PaginatedResponse<ProposalSummary>,
      {
        status?: string;
        borough?: string;
        search?: string;
        ordering?: string;
        page?: number;
      }
    >({
      query: ({ status, borough, search, ordering, page = 1 }) => {
        const params = new URLSearchParams({ page: String(page) });
        if (status) params.set("status", status);
        if (borough) params.set("borough", borough);
        if (search) params.set("search", search);
        if (ordering) params.set("ordering", ordering);
        return `proposals/?${params.toString()}`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.results.map(({ id }) => ({
                type: "Proposal" as const,
                id,
              })),
              { type: "Proposal", id: "LIST" },
            ]
          : [{ type: "Proposal", id: "LIST" }],
    }),

    getProposal: builder.query<ProposalDetail, number>({
      query: (id) => `proposals/${id}/`,
      providesTags: (_result, _err, id) => [{ type: "Proposal", id }],
    }),

    createProposal: builder.mutation<ProposalDetail, ProposalCreatePayload>({
      query: (body) => ({
        url: "proposals/",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Proposal", id: "LIST" }],
    }),

    updateProposal: builder.mutation<
      ProposalDetail,
      { id: number; body: Partial<ProposalCreatePayload> }
    >({
      query: ({ id, body }) => ({
        url: `proposals/${id}/`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_result, _err, { id }) => [
        { type: "Proposal", id },
        { type: "Proposal", id: "LIST" },
      ],
    }),

    deleteProposal: builder.mutation<void, number>({
      query: (id) => ({
        url: `proposals/${id}/`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "Proposal", id: "LIST" }],
    }),

    calculateScore: builder.mutation<{ detail: string }, number>({
      query: (id) => ({
        url: `proposals/${id}/calculate_score/`,
        method: "POST",
      }),
      invalidatesTags: (_result, _err, id) => [{ type: "Proposal", id }],
    }),

    generateProjections: builder.mutation<
      { detail: string },
      { id: number; years?: number }
    >({
      query: ({ id, years = 10 }) => ({
        url: `proposals/${id}/generate_projections/`,
        method: "POST",
        body: { years },
      }),
      invalidatesTags: (_result, _err, { id }) => [{ type: "Proposal", id }],
    }),

    // --- Analytics ---
    getNeighborhoodRankings: builder.query<NeighborhoodRanking[], void>({
      query: () => "analytics/rankings/",
      providesTags: ["Analytics"],
    }),

    getDashboardSummary: builder.query<DashboardSummary[], void>({
      query: () => "analytics/dashboard/",
      providesTags: ["Analytics"],
    }),
  }),
});

export const {
  useGetBoroughsQuery,
  useGetNeighborhoodsQuery,
  useGetNeighborhoodQuery,
  useGetProposalsQuery,
  useGetProposalQuery,
  useCreateProposalMutation,
  useUpdateProposalMutation,
  useDeleteProposalMutation,
  useCalculateScoreMutation,
  useGenerateProjectionsMutation,
  useGetNeighborhoodRankingsQuery,
  useGetDashboardSummaryQuery,
} = apiSlice;
