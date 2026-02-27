import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "../store";

export type ThemeMode = "light" | "dark";

interface UiState {
  sidebarOpen: boolean;
  filterBorough: string;
  filterStatus: string;
  sortField: string;
  sortDirection: "asc" | "desc";
  searchQuery: string;
  theme: ThemeMode;
}

const storedTheme = (): ThemeMode => {
  if (typeof window === "undefined") return "dark";
  const t = localStorage.getItem("theme") as ThemeMode | null;
  return t === "dark" || t === "light" ? t : "dark";
};

const initialState: UiState = {
  sidebarOpen: false,
  filterBorough: "",
  filterStatus: "",
  sortField: "-updated_at",
  sortDirection: "desc",
  searchQuery: "",
  theme: storedTheme(),
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    toggleSidebar(state) {
      state.sidebarOpen = !state.sidebarOpen;
    },
    closeSidebar(state) {
      state.sidebarOpen = false;
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
    setTheme(state, action: PayloadAction<ThemeMode>) {
      state.theme = action.payload;
      if (typeof window !== "undefined") localStorage.setItem("theme", action.payload);
    },
    toggleTheme(state) {
      state.theme = state.theme === "dark" ? "light" : "dark";
      if (typeof window !== "undefined") localStorage.setItem("theme", state.theme);
    },
    resetFilters() {
      return initialState;
    },
  },
});

export const {
  toggleSidebar,
  closeSidebar,
  setFilterBorough,
  setFilterStatus,
  setSortField,
  setSortDirection,
  setSearchQuery,
  setTheme,
  toggleTheme,
  resetFilters,
} = uiSlice.actions;

export const selectUi = (state: RootState) => state.ui;

export default uiSlice.reducer;
