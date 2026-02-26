import { createEntityAdapter, createSlice } from "@reduxjs/toolkit";
import type { NeighborhoodSummary } from "../../types/models";
import type { RootState } from "../store";

const neighborhoodAdapter = createEntityAdapter<NeighborhoodSummary>();

const neighborhoodSlice = createSlice({
  name: "neighborhoods",
  initialState: neighborhoodAdapter.getInitialState(),
  reducers: {
    setNeighborhoods: neighborhoodAdapter.setAll,
    upsertNeighborhood: neighborhoodAdapter.upsertOne,
  },
});

export const { setNeighborhoods, upsertNeighborhood } =
  neighborhoodSlice.actions;

export const {
  selectAll: selectAllNeighborhoods,
  selectById: selectNeighborhoodById,
} = neighborhoodAdapter.getSelectors((state: RootState) => state.neighborhoods);

export default neighborhoodSlice.reducer;
