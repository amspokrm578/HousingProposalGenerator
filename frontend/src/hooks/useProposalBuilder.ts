import { useCallback, useReducer } from "react";
import { useCreateProposalMutation } from "../store/api/apiSlice";
import type { ProposalCreatePayload, UnitMix } from "../types/models";

interface BuilderState {
  step: number;
  neighborhoodId: number | null;
  title: string;
  description: string;
  lotSizeSqft: string;
  totalUnits: number;
  unitMix: Omit<UnitMix, "id">[];
  errors: Record<string, string>;
}

type BuilderAction =
  | { type: "SET_STEP"; step: number }
  | { type: "SET_NEIGHBORHOOD"; id: number }
  | { type: "SET_FIELD"; field: keyof BuilderState; value: unknown }
  | { type: "ADD_UNIT"; unit: Omit<UnitMix, "id"> }
  | { type: "REMOVE_UNIT"; index: number }
  | { type: "UPDATE_UNIT"; index: number; unit: Omit<UnitMix, "id"> }
  | { type: "SET_ERRORS"; errors: Record<string, string> }
  | { type: "RESET" };

const initialState: BuilderState = {
  step: 0,
  neighborhoodId: null,
  title: "",
  description: "",
  lotSizeSqft: "",
  totalUnits: 0,
  unitMix: [],
  errors: {},
};

function builderReducer(state: BuilderState, action: BuilderAction): BuilderState {
  switch (action.type) {
    case "SET_STEP":
      return { ...state, step: action.step, errors: {} };
    case "SET_NEIGHBORHOOD":
      return { ...state, neighborhoodId: action.id };
    case "SET_FIELD":
      return { ...state, [action.field]: action.value };
    case "ADD_UNIT":
      return { ...state, unitMix: [...state.unitMix, action.unit] };
    case "REMOVE_UNIT":
      return {
        ...state,
        unitMix: state.unitMix.filter((_, i) => i !== action.index),
      };
    case "UPDATE_UNIT":
      return {
        ...state,
        unitMix: state.unitMix.map((u, i) =>
          i === action.index ? action.unit : u,
        ),
      };
    case "SET_ERRORS":
      return { ...state, errors: action.errors };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

export function useProposalBuilder() {
  const [state, dispatch] = useReducer(builderReducer, initialState);
  const [createProposal, { isLoading, isSuccess, error }] =
    useCreateProposalMutation();

  const validateStep = useCallback((): boolean => {
    const errors: Record<string, string> = {};

    if (state.step === 0 && !state.neighborhoodId) {
      errors.neighborhoodId = "Please select a neighborhood.";
    }

    if (state.step === 1) {
      if (!state.title.trim()) errors.title = "Title is required.";
      if (!state.lotSizeSqft || parseFloat(state.lotSizeSqft) <= 0)
        errors.lotSizeSqft = "Lot size must be positive.";
      if (state.totalUnits <= 0)
        errors.totalUnits = "Must have at least 1 unit.";
    }

    if (state.step === 2) {
      if (state.unitMix.length === 0)
        errors.unitMix = "Add at least one unit type.";
      const unitTotal = state.unitMix.reduce((sum, u) => sum + u.count, 0);
      if (unitTotal !== state.totalUnits)
        errors.unitMix = `Unit counts (${unitTotal}) must equal total units (${state.totalUnits}).`;
    }

    dispatch({ type: "SET_ERRORS", errors });
    return Object.keys(errors).length === 0;
  }, [state]);

  const nextStep = useCallback(() => {
    if (validateStep()) {
      dispatch({ type: "SET_STEP", step: state.step + 1 });
    }
  }, [state.step, validateStep]);

  const prevStep = useCallback(() => {
    dispatch({ type: "SET_STEP", step: Math.max(0, state.step - 1) });
  }, [state.step]);

  const submit = useCallback(async () => {
    if (!validateStep()) return;
    if (!state.neighborhoodId) return;

    const payload: ProposalCreatePayload = {
      title: state.title,
      description: state.description,
      neighborhood: state.neighborhoodId,
      lot_size_sqft: state.lotSizeSqft,
      total_units: state.totalUnits,
      unit_mix: state.unitMix,
    };

    await createProposal(payload).unwrap();
    dispatch({ type: "RESET" });
  }, [state, createProposal, validateStep]);

  return {
    state,
    dispatch,
    nextStep,
    prevStep,
    submit,
    isSubmitting: isLoading,
    isSuccess,
    submitError: error,
  };
}
