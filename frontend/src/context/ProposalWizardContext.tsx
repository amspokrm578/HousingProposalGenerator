import {
  createContext,
  useContext,
  type ReactNode,
} from "react";
import { useProposalBuilder } from "../hooks/useProposalBuilder";

type WizardContextType = ReturnType<typeof useProposalBuilder>;

const ProposalWizardContext = createContext<WizardContextType | null>(null);

export function ProposalWizardProvider({ children }: { children: ReactNode }) {
  const wizard = useProposalBuilder();
  return (
    <ProposalWizardContext.Provider value={wizard}>
      {children}
    </ProposalWizardContext.Provider>
  );
}

export function useWizard(): WizardContextType {
  const ctx = useContext(ProposalWizardContext);
  if (!ctx) {
    throw new Error("useWizard must be used within ProposalWizardProvider");
  }
  return ctx;
}
