"use client";

import type { MouseEvent } from "react";
import { useQueryState } from "nuqs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useEmulator, useEmulatorState } from "@/components/emulator";
import { ENVIRONMENTS, type EnvironmentKey } from "@/lib/emulator/environment";
import { emulatorParsers } from "@/lib/emulator/search-params";

const dropFocus = (e: MouseEvent) => e.preventDefault();

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
      className="flex-wrap gap-1 rounded-xl border bg-muted p-0.5"
    >
      {ENVIRONMENTS.map((env) => (
        <ToggleGroupItem
          key={env.key}
          value={env.key}
          onMouseDown={dropFocus}
          onClick={() => setEnvironment(env.key)}
          className="hover:bg-background/60 border-muted aria-pressed:bg-background! aria-pressed:border-border!"
        >
          {env.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
