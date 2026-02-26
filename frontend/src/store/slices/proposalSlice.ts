import { createEntityAdapter, createSlice } from "@reduxjs/toolkit";
import type { ProposalSummary } from "../../types/models";
import type { RootState } from "../store";

const proposalAdapter = createEntityAdapter<ProposalSummary>();

const proposalSlice = createSlice({
  name: "proposals",
  initialState: proposalAdapter.getInitialState({
    selectedId: null as number | null,
  }),
  reducers: {
    setProposals: proposalAdapter.setAll,
    upsertProposal: proposalAdapter.upsertOne,
    removeProposal: proposalAdapter.removeOne,
    selectProposal(state, action: { payload: number | null }) {
      state.selectedId = action.payload;
    },
  },
});

export const { setProposals, upsertProposal, removeProposal, selectProposal } =
  proposalSlice.actions;

export const {
  selectAll: selectAllProposals,
  selectById: selectProposalById,
  selectIds: selectProposalIds,
} = proposalAdapter.getSelectors((state: RootState) => state.proposals);

export const selectSelectedProposalId = (state: RootState) =>
  state.proposals.selectedId;

export default proposalSlice.reducer;
