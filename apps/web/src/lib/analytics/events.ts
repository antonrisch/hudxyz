import type { BackgroundKey } from "@/lib/simulator/background";
import type { View } from "@/lib/simulator/store";

export type SimulatorLoadSource = "catalog" | "custom";

export type SimulatorLoadTrigger =
  | "seed"
  | "typed"
  | "recent"
  | "popular"
  | "reload"
  | "settings"
  | "os_launch";

export type SimulatorLoadFailureStage = "timeout" | "proxy" | "navigation_aborted" | "unknown";

export type SearchResultSource = "palette" | "view_all";

export type SimulatorViewSurface = "panel" | "mobile_toolbar";

export type ScreenRecordStopReason = "manual" | "max_duration";

export type ScreenRecordFailReason = "unsupported" | "denied" | "aborted" | "encode";

export type ScreenshotTrigger = "button" | "keyboard";

export type CustomBackgroundFailReason = "size" | "type" | "processing";

type SimulatorLoadBase = {
  load_id: string;
  source: SimulatorLoadSource;
  trigger: SimulatorLoadTrigger;
  public_id?: string;
};

export type AnalyticsEventMap = {
  search_result_selected: {
    public_id?: string;
    source: SearchResultSource;
  };
  hub_try_clicked: {
    public_id: string;
  };
  simulator_load_requested: SimulatorLoadBase;
  simulator_load_succeeded: SimulatorLoadBase & {
    duration_ms: number;
  };
  simulator_load_failed: SimulatorLoadBase & {
    duration_ms: number;
    failure_stage: SimulatorLoadFailureStage;
  };
  submission_started: {
    public_id: string;
  };
  submission_completed: {
    public_id: string;
  };
  open_on_glasses_opened: {
    has_url: boolean;
    app_name_prefilled: boolean;
  };
  device_setup_link_copied: {
    has_url: boolean;
  };
  device_setup_link_copy_failed: {
    has_url: boolean;
  };
  screen_record_capability: {
    supported: boolean;
  };
  screen_record_started: Record<string, never>;
  screen_record_completed: {
    stop_reason: ScreenRecordStopReason;
    duration_ms: number;
  };
  screen_record_failed: {
    reason: ScreenRecordFailReason;
  };
  simulator_screenshot_completed: {
    trigger: ScreenshotTrigger;
  };
  simulator_screenshot_failed: {
    trigger: ScreenshotTrigger;
  };
  simulator_view_selected: {
    from: View;
    to: View;
    surface: SimulatorViewSurface;
  };
  background_selected: {
    background: BackgroundKey;
  };
  custom_background_added: {
    custom_count: number;
  };
  custom_background_removed: {
    custom_count: number;
  };
  custom_background_failed: {
    reason: CustomBackgroundFailReason;
  };
  simulator_additive_changed: {
    additive: boolean;
  };
};

export type AnalyticsEventName = keyof AnalyticsEventMap;
