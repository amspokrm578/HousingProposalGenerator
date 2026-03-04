import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type {
  Borough,
  NeighborhoodDetail,
  NeighborhoodSummary,
  PaginatedResponse,
  ProposalCreatePayload,
  ProposalDetail,
  ProposalSummary,
} from "../../types/models";

const baseQuery = fetchBaseQuery({
  baseUrl: "/api/",
  prepareHeaders: (headers: Headers) => {
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
  endpoints: (builder: any) => ({
    // --- Auth / Accounts ---
    getCurrentUser: builder.query({
      query: () => "accounts/me/",
    }),
    // --- Boroughs ---
    getBoroughs: builder.query({
      query: () => "boroughs/?format=json",
      transformResponse: (res: PaginatedResponse<Borough>) => res.results,
      providesTags: ["Borough"],
    }),

    // --- Neighborhoods ---
    getNeighborhoods: builder.query({
      query: ({
        borough,
        search,
        page = 1,
      }: { borough?: string; search?: string; page?: number }) => {
        const params = new URLSearchParams({ page: String(page) });
        if (borough) params.set("borough", borough);
        if (search) params.set("search", search);
        return `neighborhoods/?${params.toString()}`;
      },
      providesTags: (
        result: PaginatedResponse<NeighborhoodSummary> | undefined
      ) =>
        result
          ? [
              ...result.results.map(({ id }: { id: number }) => ({
                type: "Neighborhood" as const,
                id,
              })),
              { type: "Neighborhood", id: "LIST" },
            ]
          : [{ type: "Neighborhood", id: "LIST" }],
    }),

    getNeighborhood: builder.query({
      query: (id: number) => `neighborhoods/${id}/`,
      providesTags: (_result: NeighborhoodDetail, _err: unknown, id: number) => [
        { type: "Neighborhood", id },
      ],
    }),

    getNeighborhoodMapData: builder.query({
      query: () => "neighborhoods/map_data/",
      providesTags: ["Neighborhood", "Analytics"],
    }),

    // --- Proposals ---
    getProposals: builder.query({
      query: ({
        status,
        borough,
        search,
        ordering,
        page = 1,
      }: {
        status?: string;
        borough?: string;
        search?: string;
        ordering?: string;
        page?: number;
      }) => {
        const params = new URLSearchParams({ page: String(page) });
        if (status) params.set("status", status);
        if (borough) params.set("borough", borough);
        if (search) params.set("search", search);
        if (ordering) params.set("ordering", ordering);
        return `proposals/?${params.toString()}`;
      },
      providesTags: (result: PaginatedResponse<ProposalSummary> | undefined) =>
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

    getProposal: builder.query({
      query: (id: number) => `proposals/${id}/`,
      providesTags: (_result: ProposalDetail, _err: unknown, id: number) => [
        { type: "Proposal", id },
      ],
    }),

    createProposal: builder.mutation({
      query: (body: ProposalCreatePayload) => ({
        url: "proposals/",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Proposal", id: "LIST" }],
    }),

    updateProposal: builder.mutation({
      query: ({
        id,
        body,
      }: { id: number; body: Partial<ProposalCreatePayload> }) => ({
        url: `proposals/${id}/`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_result: ProposalDetail, _err: unknown, { id }: { id: number }) => [
        { type: "Proposal", id },
        { type: "Proposal", id: "LIST" },
      ],
    }),

    deleteProposal: builder.mutation({
      query: (id: number) => ({
        url: `proposals/${id}/`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "Proposal", id: "LIST" }],
    }),

    calculateScore: builder.mutation({
      query: (id: number) => ({
        url: `proposals/${id}/calculate_score/`,
        method: "POST",
      }),
      invalidatesTags: (_result: { detail: string }, _err: unknown, id: number) => [
        { type: "Proposal", id },
      ],
    }),

    generateProjections: builder.mutation({
      query: ({ id, years = 10 }: { id: number; years?: number }) => ({
        url: `proposals/${id}/generate_projections/`,
        method: "POST",
        body: { years },
      }),
      invalidatesTags: (
        _result: { detail: string },
        _err: unknown,
        { id }: { id: number }
      ) => [{ type: "Proposal", id }],
    }),

    // --- Analytics ---
    getNeighborhoodRankings: builder.query({
      query: () => "analytics/rankings/",
      providesTags: ["Analytics"],
    }),

    getDashboardSummary: builder.query({
      query: () => "analytics/dashboard/",
      providesTags: ["Analytics"],
    }),

    // --- Green-Tape Agent Pipeline ---
    runGreenTapePipeline: builder.mutation({
      query: (body: {
        neighborhood_id: number;
        lot_size_sqft: number;
        user_goal: string;
        additional_notes?: string;
        max_iterations?: number;
      }) => ({
        url: "proposals/green-tape-run/",
        method: "POST",
        body,
      }),
    }),
  }),
});

export const {
  useGetCurrentUserQuery,
  useGetBoroughsQuery,
  useGetNeighborhoodsQuery,
  useGetNeighborhoodQuery,
  useGetNeighborhoodMapDataQuery,
  useGetProposalsQuery,
  useGetProposalQuery,
  useCreateProposalMutation,
  useUpdateProposalMutation,
  useDeleteProposalMutation,
  useCalculateScoreMutation,
  useGenerateProjectionsMutation,
  useGetNeighborhoodRankingsQuery,
  useGetDashboardSummaryQuery,
  useRunGreenTapePipelineMutation,
} = apiSlice;
