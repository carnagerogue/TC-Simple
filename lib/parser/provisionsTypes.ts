export type ProvisionSource = {
  page?: number;
  quote?: string;
};

export type PromissoryNoteProvision = {
  exists: boolean;
  amount?: number;
  dueDate?: string;
  payer?: string;
  payee?: string;
  notes?: string;
  source?: ProvisionSource;
};

export type FeasibilityProvision = {
  exists: boolean;
  periodDays?: number;
  expirationDate?: string;
  requiresNotice?: boolean;
  notes?: string;
  source?: ProvisionSource;
};

export type FinancingProvision = {
  type?: string;
  deadline?: string;
  notes?: string;
  source?: ProvisionSource;
};

export type ContingencyProvision = {
  type: string;
  deadline?: string;
  notes?: string;
  source?: ProvisionSource;
};

export type OtherProvision = {
  label: string;
  value: string;
  notes?: string;
  source?: ProvisionSource;
};

export type ExtractedProvisions = {
  promissoryNote?: PromissoryNoteProvision;
  feasibility?: FeasibilityProvision;
  financing?: FinancingProvision;
  contingencies?: ContingencyProvision[];
  other?: OtherProvision[];
};
