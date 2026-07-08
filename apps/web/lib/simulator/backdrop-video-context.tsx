"use client";

import { createContext, useContext, useMemo, useRef, type ReactNode } from "react";

type BackdropVideoLeaderContextValue = {
  /** Read the current leader element (may be null). */
  getLeader: () => HTMLVideoElement | null;
  /** Register (or unregister) the leader video element. No-ops if the element is unchanged. */
  setLeader: (el: HTMLVideoElement | null) => void;
  /** Subscribe to leader changes. Returns an unsubscribe function. */
  subscribe: (cb: () => void) => () => void;
};

const BackdropVideoLeaderContext = createContext<BackdropVideoLeaderContextValue | null>(null);

export function BackdropVideoLeaderProvider({ children }: { children: ReactNode }) {
  const leaderRef = useRef<HTMLVideoElement | null>(null);
  const listenersRef = useRef(new Set<() => void>());

  // Stable forever — no state, just refs. Context consumers never re-render from this.
  const value = useMemo<BackdropVideoLeaderContextValue>(
    () => ({
      getLeader: () => leaderRef.current,
      setLeader: (el: HTMLVideoElement | null) => {
        if (leaderRef.current === el) return;
        leaderRef.current = el;
        for (const cb of listenersRef.current) cb();
      },
      subscribe: (cb: () => void) => {
        listenersRef.current.add(cb);
        return () => {
          listenersRef.current.delete(cb);
        };
      },
    }),
    [],
  );

  return (
    <BackdropVideoLeaderContext.Provider value={value}>
      {children}
    </BackdropVideoLeaderContext.Provider>
  );
}

export function useBackdropVideoLeaderContext() {
  return useContext(BackdropVideoLeaderContext);
}
