import type { OpenKind } from "@/lib/apps/track-open";
import type { SocialShareChannel } from "@/lib/apps/share-targets";

export type SimulatorLoadSource = "catalog" | "custom";

export type ListingShareChannel = "native" | "copy" | SocialShareChannel;

export type SearchResultSource = "palette" | "view_all";

export type AnalyticsEventMap = {
  search_result_selected: {
    public_id?: string;
    source: SearchResultSource;
  };
  listing_opened: {
    public_id: string;
    kind: OpenKind;
  };
  listing_shared: {
    public_id: string;
    channel: ListingShareChannel;
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
  submission_icon_uploaded: {
    public_id: string;
    source: "upload" | "import";
  };
  submission_completed: {
    public_id: string;
  };
};

export type AnalyticsEventName = keyof AnalyticsEventMap;
