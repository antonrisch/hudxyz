export type SimulatorLoadSource = "catalog" | "custom";

export type SearchResultSource = "palette" | "view_all";

export type AnalyticsEventMap = {
  search_result_selected: {
    public_id?: string;
    source: SearchResultSource;
  };
  simulator_load_requested: {
    source: SimulatorLoadSource;
  };
  simulator_load_succeeded: {
    source: SimulatorLoadSource;
  };
  simulator_load_failed: {
    source: SimulatorLoadSource;
    failure_stage: "timeout" | "proxy" | "unknown";
  };
  submission_started: {
    public_id: string;
  };
  submission_completed: {
    public_id: string;
  };
};

export type AnalyticsEventName = keyof AnalyticsEventMap;
