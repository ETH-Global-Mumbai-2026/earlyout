"use client";

import { CalendarClock, Lock, LockOpen } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { type ReactNode, useId } from "react";
import { CardShell, EASE, Stage, Steps, usePhase, useScene } from "./Scene";

const SLOTS = 5; // the gate: 5% of the fund, one slot per 1% request
const OVER = 3; // requests that arrive after the gate is full
const TICK_MS = 560;
const LENGTH = 16; // ticks per loop
const FINAL = 12; // the still frame: queue full, gate shut, the rest rolled over
const TICKS = Array.from({ length: LENGTH }, () => TICK_MS);

const STEPS = ["Requests drop into this quarter's queue", "At 5% of the fund the gate shuts", "The rest roll to next quarter and wait again"] as const;
const stepOf = (p: number) => (p <= SLOTS ? 0 : p <= 10 ? 1 : 2);
const STEP_MS = [0, 1, 2].map((s) => TICKS.filter((_, p) => stepOf(p) === s).length * TICK_MS);

const LABEL =
  "A fund's quarterly redemption queue. Requests of 1% each drop into this quarter's window until they reach the gate at 5% of the fund. The gate shuts, and the requests above it roll over to the next quarter, where they wait again.";

const DROP = { type: "spring" as const, stiffness: 520, damping: 17, mass: 0.9 };

/// Why holders wait: requests drop into a quarter's queue like coins into a
/// slot, the 5% gate swings shut on the rest, and those requests slide over to
/// next quarter. Loops only while on screen; reduced motion, the server render
/// and off screen show the final frame.
export function GateCalendar() {
  const { ref, mode, play, animated } = useScene<HTMLElement>(0.4);
  const uid = useId();
  const { phase, cycle } = usePhase(play, TICKS, 900);
  const live = phase >= 0;
  const p = live ? phase : FINAL;
  const paid = Math.min(p, SLOTS);
  const shut = p > SLOTS;
  const over = Math.max(0, Math.min(p - SLOTS - 1, OVER));
  const rolled = p >= 11;
  const fading = p === LENGTH - 1;
  const show = mode !== "pre";

  const waiting = (i: number) => (
    <motion.div
      key={`w${i}-${cycle}`}
      layoutId={`${uid}-roll-${i}-${cycle}`}
      className="absolute inset-0"
      initial={live && !rolled ? { opacity: 0, y: -26 } : false}
      animate={rolled ? { opacity: fading ? 0 : 1, y: 0 } : { opacity: 1, y: 0, x: [0, -4, 3, -2, 0] }}
      transition={{ ...DROP, x: { duration: 0.4, delay: 0.18 }, layout: { duration: 0.7, ease: EASE }, opacity: { duration: 0.3 } }}
    >
      <Coin waiting />
    </motion.div>
  );

  return (
    <figure ref={ref} className="text-left">
      <Stage enabled={animated}>
        <div role="img" aria-label={LABEL} className="grid gap-4 md:grid-cols-2">
          <CardShell id="this" show={show} active={live && !rolled}>
            <div className="p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="t-label">This quarter</span>
                <GatePill shut={shut} />
              </div>
              <div className="mt-1.5 text-[12.5px] leading-snug text-muted">
                Paid out <span className="num font-mono font-medium text-ink">{paid}%</span> of 5%
              </div>
              <div className="mt-6 flex items-stretch gap-2">
                <div className="grid flex-[5] grid-cols-5 gap-1.5">
                  {Array.from({ length: SLOTS }, (_, i) => (
                    <Well key={i}>
                      <AnimatePresence>
                        {i < paid && (
                          <motion.div
                            key={`p${i}-${cycle}`}
                            className="absolute inset-0"
                            initial={live ? { opacity: 0, y: -26, rotate: -12 } : false}
                            animate={{ opacity: fading ? 0 : 1, y: 0, rotate: 0 }}
                            exit={{ opacity: 0, transition: { duration: 0.2 } }}
                            transition={{ ...DROP, opacity: { duration: 0.2 } }}
                          >
                            <Coin />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Well>
                  ))}
                </div>
                <Gate shut={shut} live={live} />
                <div className="grid flex-[3] grid-cols-3 gap-1.5">
                  {Array.from({ length: OVER }, (_, i) => (
                    <div key={i} className="relative h-11 rounded-md border border-dashed border-line-strong">
                      {i < over && !rolled && waiting(i)}
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-2 flex gap-2 text-[12px] leading-4 text-muted">
                <span className="flex-[5]">Up to 5% of the fund</span>
                <span className="w-1 shrink-0" />
                <span className="flex-[3]">Over the gate</span>
              </div>
            </div>
          </CardShell>

          <CardShell id="next" show={show} enterDelay={0.12} active={live && rolled && !fading}>
            <div className="p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="t-label">Next quarter</span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-sunk px-2 py-0.5 text-[11.5px] font-medium text-ink-2">
                  <CalendarClock size={12} aria-hidden />
                  Gate 5%
                </span>
              </div>
              <div className="mt-1.5 text-[12.5px] leading-snug text-muted">
                Waiting <span className="num font-mono font-medium text-ink">{rolled ? OVER : 0}%</span> from last quarter
              </div>
              <div className="mt-6 flex items-stretch gap-2">
                <div className="grid flex-[5] grid-cols-5 gap-1.5">
                  {Array.from({ length: SLOTS }, (_, i) => (
                    <Well key={i}>{i < OVER && rolled && waiting(i)}</Well>
                  ))}
                </div>
                <span className="w-1 shrink-0" />
                <span className="flex-[3]" />
              </div>
              <p className="mt-2 text-[12px] leading-4 text-muted">{rolled ? "Rolled over, waiting again" : "Opens next quarter"}</p>
            </div>
          </CardShell>
        </div>
      </Stage>
      <figcaption>
        <Steps steps={STEPS} active={live ? stepOf(p) : -1} cycle={cycle} durations={STEP_MS} />
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted">
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="h-3 w-2.5 rounded-[2px] bg-ink-2" />
            Paid this quarter
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="h-3 w-2.5 rounded-[2px] border border-ink-2" />
            Still waiting
          </span>
        </div>
      </figcaption>
    </figure>
  );
}

/// A recessed slot in the queue.
function Well({ children }: { children?: ReactNode }) {
  return <div className="relative h-11 rounded-md bg-sunk shadow-[inset_0_2px_4px_rgba(40,30,10,0.14)] ring-1 ring-inset ring-hairline dark:shadow-[inset_0_2px_5px_rgba(0,0,0,0.6)]">{children}</div>;
}

/// One 1% request, as a token that fills its slot. Paid ones are solid;
/// waiting ones are outlined.
function Coin({ waiting = false }: { waiting?: boolean }) {
  return (
    <span
      aria-hidden
      className={`absolute inset-[3px] grid place-items-center rounded-[5px] font-mono text-[10px] font-semibold leading-none ${
        waiting
          ? "bg-surface text-ink-2 ring-[1.5px] ring-inset ring-ink-2 shadow-[0_4px_10px_-4px_rgba(40,30,10,0.4)]"
          : "bg-ink-2 text-canvas shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_4px_10px_-4px_rgba(40,30,10,0.55)]"
      }`}
    >
      1%
    </span>
  );
}

/// The gate between the window and the overflow: a dashed line while open, a
/// solid bar that drops shut once the window is full.
function Gate({ shut, live }: { shut: boolean; live: boolean }) {
  return (
    <div className="relative w-1 shrink-0">
      <div className="absolute inset-y-0 left-[1.5px] border-l border-dashed border-line-strong" />
      <motion.div
        initial={false}
        animate={{ scaleY: shut ? 1 : 0 }}
        transition={live ? { type: "spring", stiffness: 380, damping: 22 } : { duration: 0 }}
        className="absolute -inset-y-2 inset-x-0 origin-top rounded-full bg-ink shadow-[0_6px_12px_-4px_rgba(40,30,10,0.5)]"
      />
    </div>
  );
}

function GatePill({ shut }: { shut: boolean }) {
  return (
    <span
      className={`relative inline-flex items-center gap-1.5 overflow-hidden rounded-full px-2 py-0.5 text-[11.5px] font-medium transition-colors duration-300 ${shut ? "bg-ink text-canvas" : "bg-brand/10 text-brand"}`}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={shut ? "shut" : "open"}
          className="inline-flex items-center gap-1.5"
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -10, opacity: 0 }}
          transition={{ duration: 0.25, ease: EASE }}
        >
          {shut ? <Lock size={12} aria-hidden /> : <LockOpen size={12} aria-hidden />}
          {shut ? "Gate shut" : "Gate open"}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
