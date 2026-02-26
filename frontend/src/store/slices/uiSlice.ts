import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "../store";

interface UiState {
  sidebarOpen: boolean;
  filterBorough: string;
  filterStatus: string;
  sortField: string;
  sortDirection: "asc" | "desc";
  searchQuery: string;
}

const initialState: UiState = {
  sidebarOpen: true,
  filterBorough: "",
  filterStatus: "",
  sortField: "-updated_at",
  sortDirection: "desc",
  searchQuery: "",
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    toggleSidebar(state) {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setFilterBorough(state, action: PayloadAction<string>) {
      state.filterBorough = action.payload;
    },
    setFilterStatus(state, action: PayloadAction<string>) {
      state.filterStatus = action.payload;
    },
    setSortField(state, action: PayloadAction<string>) {
      state.sortField = action.payload;
    },
    setSortDirection(state, action: PayloadAction<"asc" | "desc">) {
      state.sortDirection = action.payload;
    },
    setSearchQuery(state, action: PayloadAction<string>) {
      state.searchQuery = action.payload;
    },
    resetFilters() {
      return initialState;
    },
  },
});

export const {
  toggleSidebar,
  setFilterBorough,
  setFilterStatus,
  setSortField,
  setSortDirection,
  setSearchQuery,
  resetFilters,
} = uiSlice.actions;

export const selectUi = (state: RootState) => state.ui;

export default uiSlice.reducer;
