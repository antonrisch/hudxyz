import {
  createSignal,
  createMemo,
  createEffect,
  on,
  onMount,
  onCleanup,
  Switch,
  Match,
  Show,
} from "solid-js";
import { Tracker } from "../lib/tracker";
import { fmtTime, fmtDist, fmtPace, kmh } from "../lib/format";
import { focusFirst, handleListNav } from "../lib/dpad";

// one secondary stat cell; turns accent when highlighted
function Stat(props: { label: string; value: string; selected?: boolean }) {
  return (
    <div class="flex flex-col items-center gap-0.5">
      <span
        class="text-[42px] font-semibold tabular-nums"
        classList={{ "text-ink": !props.selected, "text-accent": props.selected }}
      >
        {props.value}
      </span>
      <span
        class="text-[16px] tracking-[0.08em] uppercase"
        classList={{ "text-ink/50": !props.selected, "text-ink/90": props.selected }}
      >
        {props.label}
      </span>
    </div>
  );
}

export default function Speedometer() {
  const tracker = new Tracker();
  const [snap, setSnap] = createSignal(tracker.snapshot());
  tracker.onChange = () => setSnap(tracker.snapshot());

  let root!: HTMLDivElement;
  const state = createMemo(() => snap().state);
  const isPaused = () => state() === "paused";

  // re-focus the first control whenever we enter a non-tracking screen
  createEffect(
    on(state, (s) => {
      if (s !== "active") focusFirst(root);
    }),
  );

  onMount(() => {
    const onKey = (e: KeyboardEvent) => {
      if (tracker.state === "active") {
        if (e.key === "Enter") tracker.pause();
        else if (e.key === "ArrowLeft") tracker.cycleSecondary(-1);
        else if (e.key === "ArrowRight") tracker.cycleSecondary(1);
        else return;
        e.preventDefault();
      } else {
        handleListNav(e, root);
      }
    };
    document.addEventListener("keydown", onKey);
    // refresh clock / acquire readout between fixes
    const tick = setInterval(() => {
      if (tracker.state === "active" || tracker.state === "acquiring") setSnap(tracker.snapshot());
    }, 500);
    onCleanup(() => {
      document.removeEventListener("keydown", onKey);
      clearInterval(tick);
    });
  });

  const hero = () => (snap().mode === "ride" ? kmh(snap().speedMs) : fmtPace(snap().speedMs));
  const heroUnit = () => (snap().mode === "ride" ? "km/h" : "/km");
  const avg = () => (snap().mode === "ride" ? kmh(snap().avgMs) : fmtPace(snap().avgMs));
  const max = () => (snap().mode === "ride" ? kmh(snap().maxMs) : fmtPace(snap().maxMs));
  const acqDetail = () =>
    snap().acquire.error ?? (snap().accuracyM == null ? "searching…" : `±${snap().accuracyM} m`);

  return (
    <div ref={(el) => (root = el)} class="relative h-full w-full text-ink" data-state={state()}>
      <Switch>
        <Match when={state() === "menu"}>
          <section class="absolute inset-0 flex flex-col items-center justify-center gap-5 p-8">
            <h1 class="title">Lenswolf</h1>
            <p class="subtitle">Choose activity</p>
            <div class="opts">
              <button
                class="opt"
                data-focusable
                onClick={() => {
                  tracker.setMode("ride");
                  tracker.start();
                }}
              >
                Ride
              </button>
              <button
                class="opt"
                data-focusable
                onClick={() => {
                  tracker.setMode("run");
                  tracker.start();
                }}
              >
                Run
              </button>
            </div>
            <p class="hint">↑ ↓ choose · Enter start</p>
          </section>
        </Match>

        <Match when={state() === "acquiring"}>
          <section class="absolute inset-0 flex flex-col items-center justify-center gap-5 p-8">
            <h2 class="text-[34px] font-semibold">Acquiring GPS</h2>
            <p class="text-[26px] text-accent tabular-nums min-h-7.5">
              {fmtTime(snap().acquire.elapsedMs)} · {acqDetail()}
            </p>
            <div class="opts">
              <button class="opt opt-sm" data-focusable onClick={() => tracker.skipAcquire()}>
                Start anyway
              </button>
              <button class="opt opt-sm" data-focusable onClick={() => tracker.cancel()}>
                Cancel
              </button>
            </div>
            <p class="hint">↑ ↓ choose · Enter select</p>
          </section>
        </Match>

        <Match when={state() === "active" || state() === "paused"}>
          <section class="absolute inset-0 grid grid-rows-[auto_1fr_auto_auto] gap-4 p-8">
            <div class="flex items-center justify-between text-[20px] text-ink/70">
              <span class="tracking-[0.08em]">{snap().mode === "ride" ? "RIDE" : "RUN"}</span>
              <span classList={{ "text-accent tracking-[0.08em]": isPaused() }}>
                {isPaused()
                  ? "PAUSED"
                  : (snap().statusError ??
                    (snap().accuracyM != null ? `GPS ±${snap().accuracyM} m` : ""))}
              </span>
            </div>

            <div class="flex flex-col items-center justify-center">
              <span
                class="text-[150px] leading-[0.9] font-bold tabular-nums"
                classList={{ "opacity-50": isPaused() }}
              >
                {hero()}
              </span>
              <span class="text-[30px] text-accent tracking-[0.06em]">{heroUnit()}</span>
            </div>

            <div class="grid w-full grid-cols-2 gap-x-10 gap-y-3.5">
              <Stat
                label="DIST"
                value={fmtDist(snap().distanceM)}
                selected={snap().secondaryIndex === 0}
              />
              <Stat
                label="TIME"
                value={fmtTime(snap().elapsedMs)}
                selected={snap().secondaryIndex === 1}
              />
              <Stat label="AVG" value={avg()} selected={snap().secondaryIndex === 2} />
              <Stat
                label={snap().mode === "ride" ? "MAX" : "BEST"}
                value={max()}
                selected={snap().secondaryIndex === 3}
              />
            </div>

            <div class="flex items-center justify-center">
              <Show when={isPaused()} fallback={<p class="hint">Enter pause · ←→ stat</p>}>
                <div class="flex gap-4">
                  <button class="opt opt-sm" data-focusable onClick={() => tracker.resume()}>
                    Resume
                  </button>
                  <button class="opt opt-sm" data-focusable onClick={() => tracker.stop()}>
                    Stop
                  </button>
                </div>
              </Show>
            </div>
          </section>
        </Match>

        <Match when={state() === "summary"}>
          <section class="absolute inset-0 flex flex-col items-center justify-center gap-5 p-8">
            <h2 class="text-[34px] font-semibold">
              {snap().mode === "ride" ? "Ride" : "Run"} complete
            </h2>
            <div class="grid w-full grid-cols-2 gap-x-10 gap-y-3.5">
              <Stat label="DIST" value={fmtDist(snap().distanceM)} />
              <Stat label="TIME" value={fmtTime(snap().elapsedMs)} />
              <Stat label={snap().mode === "ride" ? "AVG km/h" : "AVG /km"} value={avg()} />
              <Stat label={snap().mode === "ride" ? "MAX km/h" : "BEST /km"} value={max()} />
            </div>
            <button class="opt opt-sm" data-focusable onClick={() => tracker.toMenu()}>
              Done
            </button>
          </section>
        </Match>
      </Switch>
    </div>
  );
}
