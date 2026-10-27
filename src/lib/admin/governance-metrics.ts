export type GovernanceMetric = {
  value: number;
  status: "AVAILABLE" | "NO_DATA";
  window: "SELECTED_PERIOD" | "CURRENT_SNAPSHOT";
  definition: string;
  source: string;
  denominator: null;
};
export type GovernanceSummary = {
  scope: "PAP_GLOBAL";
  timezone: "UTC";
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
  invitationsCreated: GovernanceMetric;
  pendingAssignments: GovernanceMetric;
  commercialUsers: GovernanceMetric;
  unitsAwaitingActivation: GovernanceMetric;
};
