"use client";

import type { MouseEvent } from "react";
import { Moon, Sun, type LucideIcon } from "lucide-react";
import { useQueryState } from "nuqs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useEmulator, useEmulatorState } from "@/components/emulator";
import { ENVIRONMENTS, type EnvironmentKey } from "@/lib/emulator/environment";
import { emulatorParsers } from "@/lib/emulator/search-params";

const dropFocus = (e: MouseEvent) => e.preventDefault();

const ENVIRONMENT_ICONS = {
  daylight: Sun,
  night: Moon,
} satisfies Record<EnvironmentKey, LucideIcon>;

export function EnvironmentPicker() {
  const { store } = useEmulator();
  const environment = useEmulatorState((s) => s.environment);
  const [, setEnvironmentParam] = useQueryState("environment", emulatorParsers.environment);

  const setEnvironment = (next: EnvironmentKey) => {
    store.getState().setEnvironment(next);
    void setEnvironmentParam(next);
  };

  return (
    <ToggleGroup
      variant="outline"
      aria-label="Environment"
      value={[environment]}
      onValueChange={(vals) => {
        const next = vals[0];
        if (next) setEnvironment(next as EnvironmentKey);
      }}
      className="flex-wrap gap-0.5 rounded-xl border bg-muted p-0.5"
    >
      {ENVIRONMENTS.map((env) => {
        const Icon = ENVIRONMENT_ICONS[env.key];
        return (
          <ToggleGroupItem
            key={env.key}
            value={env.key}
            aria-label={env.label}
            onMouseDown={dropFocus}
            onClick={() => setEnvironment(env.key)}
            className="hover:bg-background/60 border-muted aria-pressed:bg-background! aria-pressed:border-border!"
          >
            <Icon />
          </ToggleGroupItem>
        );
      })}
    </ToggleGroup>
  );
}
