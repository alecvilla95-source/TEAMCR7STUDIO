import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface TimerState {
  durationSeconds: number;
  baseSeconds: number;
  startedAt: number | null;
  isRunning: boolean;
  updatedAt: number;
}

interface TimerContextValue {
  secondsLeft: number;
  durationSeconds: number;
  isRunning: boolean;
  timer: {
    isRunning: boolean;
    durationSeconds: number;
  };
  startTimer: () => void;
  pauseTimer: () => void;
  stopTimer: () => void;
  resetTimer: (seconds?: number) => void;
  restartTimer: () => void;
  setDurationMinutes: (minutes: number) => void;
  setTimerMinutes: (minutes: number) => void;
  setSecondsLeft: (seconds: number) => void;
  addSeconds: (seconds: number) => void;
}

const TimerContext = createContext<TimerContextValue | null>(null);

const STORAGE_KEY = "teamcr7studio_timer_state";

const DEFAULT_DURATION_SECONDS = 20 * 60;

function getDefaultState(): TimerState {
  return {
    durationSeconds: DEFAULT_DURATION_SECONDS,
    baseSeconds: DEFAULT_DURATION_SECONDS,
    startedAt: null,
    isRunning: false,
    updatedAt: Date.now(),
  };
}

function clampSeconds(value: number) {
  if (Number.isNaN(value)) return 0;

  return Math.max(0, Math.round(value));
}

function readTimerState(): TimerState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return getDefaultState();
    }

    const parsed = JSON.parse(raw) as Partial<TimerState>;

    return {
      durationSeconds:
        typeof parsed.durationSeconds === "number"
          ? clampSeconds(parsed.durationSeconds)
          : DEFAULT_DURATION_SECONDS,

      baseSeconds:
        typeof parsed.baseSeconds === "number"
          ? clampSeconds(parsed.baseSeconds)
          : DEFAULT_DURATION_SECONDS,

      startedAt:
        typeof parsed.startedAt === "number"
          ? parsed.startedAt
          : null,

      isRunning:
        typeof parsed.isRunning === "boolean"
          ? parsed.isRunning
          : false,

      updatedAt:
        typeof parsed.updatedAt === "number"
          ? parsed.updatedAt
          : Date.now(),
    };
  } catch {
    return getDefaultState();
  }
}

function getComputedSecondsLeft(state: TimerState) {
  if (!state.isRunning || !state.startedAt) {
    return clampSeconds(state.baseSeconds);
  }

  const elapsedSeconds = Math.floor(
    (Date.now() - state.startedAt) / 1000
  );

  return clampSeconds(state.baseSeconds - elapsedSeconds);
}

function normalizeState(state: TimerState): TimerState {
  const secondsLeft = getComputedSecondsLeft(state);

  if (state.isRunning && secondsLeft <= 0) {
    return {
      ...state,
      baseSeconds: 0,
      startedAt: null,
      isRunning: false,
      updatedAt: Date.now(),
    };
  }

  return state;
}

function saveTimerState(state: TimerState) {
  const normalized = normalizeState(state);

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(normalized)
  );

  window.dispatchEvent(
    new Event("teamcr7studio_timer_sync")
  );

  return normalized;
}

export function TimerProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [timerState, setTimerState] = useState<TimerState>(() =>
    normalizeState(readTimerState())
  );

  const secondsLeft = getComputedSecondsLeft(timerState);

  function updateTimerState(
    updater: (current: TimerState) => TimerState
  ) {
    setTimerState((current) => {
      const latest = normalizeState(readTimerState());

      const next = saveTimerState(
        updater(latest)
      );

      return next;
    });
  }

  function startTimer() {
    updateTimerState((current) => {
      const currentSeconds = getComputedSecondsLeft(current);

      return {
        ...current,
        baseSeconds:
          currentSeconds > 0
            ? currentSeconds
            : current.durationSeconds,
        startedAt: Date.now(),
        isRunning: true,
        updatedAt: Date.now(),
      };
    });
  }

  function pauseTimer() {
    updateTimerState((current) => {
      const currentSeconds = getComputedSecondsLeft(current);

      return {
        ...current,
        baseSeconds: currentSeconds,
        startedAt: null,
        isRunning: false,
        updatedAt: Date.now(),
      };
    });
  }

  function stopTimer() {
    pauseTimer();
  }

  function resetTimer(seconds?: number) {
    updateTimerState((current) => {
      const nextSeconds =
        typeof seconds === "number"
          ? clampSeconds(seconds)
          : current.durationSeconds;

      return {
        ...current,
        durationSeconds: nextSeconds,
        baseSeconds: nextSeconds,
        startedAt: null,
        isRunning: false,
        updatedAt: Date.now(),
      };
    });
  }

  function restartTimer() {
    updateTimerState((current) => {
      return {
        ...current,
        baseSeconds: current.durationSeconds,
        startedAt: Date.now(),
        isRunning: true,
        updatedAt: Date.now(),
      };
    });
  }

  function setDurationMinutes(minutes: number) {
    const safeMinutes = Math.max(1, Math.round(minutes));

    const nextSeconds = safeMinutes * 60;

    resetTimer(nextSeconds);
  }

  function setTimerMinutes(minutes: number) {
    setDurationMinutes(minutes);
  }

  function setSecondsLeft(seconds: number) {
    updateTimerState((current) => {
      return {
        ...current,
        baseSeconds: clampSeconds(seconds),
        startedAt: current.isRunning ? Date.now() : null,
        updatedAt: Date.now(),
      };
    });
  }

  function addSeconds(seconds: number) {
    updateTimerState((current) => {
      const currentSeconds = getComputedSecondsLeft(current);

      return {
        ...current,
        baseSeconds: clampSeconds(currentSeconds + seconds),
        startedAt: current.isRunning ? Date.now() : null,
        updatedAt: Date.now(),
      };
    });
  }

  useEffect(() => {
    function syncTimer() {
      setTimerState(normalizeState(readTimerState()));
    }

    window.addEventListener(
      "storage",
      syncTimer
    );

    window.addEventListener(
      "focus",
      syncTimer
    );

    window.addEventListener(
      "teamcr7studio_timer_sync",
      syncTimer
    );

    const interval = window.setInterval(() => {
      const latest = normalizeState(readTimerState());

      if (
        latest.isRunning ||
        timerState.isRunning
      ) {
        setTimerState(latest);
      }
    }, 250);

    return () => {
      window.removeEventListener(
        "storage",
        syncTimer
      );

      window.removeEventListener(
        "focus",
        syncTimer
      );

      window.removeEventListener(
        "teamcr7studio_timer_sync",
        syncTimer
      );

      window.clearInterval(interval);
    };
  }, [timerState.isRunning]);

  const value = useMemo<TimerContextValue>(() => {
    return {
      secondsLeft,
      durationSeconds: timerState.durationSeconds,
      isRunning: timerState.isRunning,
      timer: {
        isRunning: timerState.isRunning,
        durationSeconds: timerState.durationSeconds,
      },
      startTimer,
      pauseTimer,
      stopTimer,
      resetTimer,
      restartTimer,
      setDurationMinutes,
      setTimerMinutes,
      setSecondsLeft,
      addSeconds,
    };
  }, [
    secondsLeft,
    timerState.durationSeconds,
    timerState.isRunning,
  ]);

  return (
    <TimerContext.Provider value={value}>
      {children}
    </TimerContext.Provider>
  );
}

export function useTimer() {
  const context = useContext(TimerContext);

  if (!context) {
    throw new Error(
      "useTimer debe usarse dentro de TimerProvider"
    );
  }

  return context;
}