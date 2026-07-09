import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  loadData,
  saveData,
} from "../services/storageService";

interface TimerState {
  durationSeconds: number;
  remainingSeconds: number;
  isRunning: boolean;
  startedAt: number | null;
}

interface TimerContextType {
  timer: TimerState;
  secondsLeft: number;
  setTimerDuration: (seconds: number) => void;
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: (seconds?: number) => void;
}

const DEFAULT_TIMER: TimerState = {
  durationSeconds: 20 * 60,
  remainingSeconds: 20 * 60,
  isRunning: false,
  startedAt: null,
};

const STORAGE_KEY =
  "teamcr7studio_timer";

const TimerContext =
  createContext<TimerContextType>(
    {} as TimerContextType
  );

function getSecondsLeft(timer: TimerState) {
  if (!timer.isRunning || !timer.startedAt) {
    return timer.remainingSeconds;
  }

  const elapsed = Math.floor(
    (Date.now() - timer.startedAt) / 1000
  );

  return Math.max(
    0,
    timer.remainingSeconds - elapsed
  );
}

export function TimerProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [timer, setTimerState] =
    useState<TimerState>(() =>
      loadData<TimerState>(
        "timer",
        DEFAULT_TIMER
      )
    );

  const [secondsLeft, setSecondsLeft] =
    useState(() => getSecondsLeft(timer));

  function updateTimer(next: TimerState) {
    setTimerState(next);
    setSecondsLeft(getSecondsLeft(next));
    saveData("timer", next);
  }

  function setTimerDuration(seconds: number) {
    const cleanSeconds = Math.max(
      1,
      Math.floor(seconds)
    );

    updateTimer({
      durationSeconds: cleanSeconds,
      remainingSeconds: cleanSeconds,
      isRunning: false,
      startedAt: null,
    });
  }

  function startTimer() {
    const current = getSecondsLeft(timer);

    if (current <= 0) return;

    updateTimer({
      ...timer,
      remainingSeconds: current,
      isRunning: true,
      startedAt: Date.now(),
    });
  }

  function pauseTimer() {
    const current = getSecondsLeft(timer);

    updateTimer({
      ...timer,
      remainingSeconds: current,
      isRunning: false,
      startedAt: null,
    });
  }

  function resetTimer(seconds = timer.durationSeconds) {
    updateTimer({
      durationSeconds: seconds,
      remainingSeconds: seconds,
      isRunning: false,
      startedAt: null,
    });
  }

  useEffect(() => {
    const interval = window.setInterval(() => {
      const current = getSecondsLeft(timer);

      setSecondsLeft(current);

      if (timer.isRunning && current === 0) {
        const stopped: TimerState = {
          ...timer,
          remainingSeconds: 0,
          isRunning: false,
          startedAt: null,
        };

        setTimerState(stopped);
        saveData("timer", stopped);
      }
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [timer]);

  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key !== STORAGE_KEY) return;

      const updated = loadData<TimerState>(
        "timer",
        DEFAULT_TIMER
      );

      setTimerState(updated);
      setSecondsLeft(getSecondsLeft(updated));
    }

    window.addEventListener(
      "storage",
      handleStorage
    );

    return () => {
      window.removeEventListener(
        "storage",
        handleStorage
      );
    };
  }, []);

  return (
    <TimerContext.Provider
      value={{
        timer,
        secondsLeft,
        setTimerDuration,
        startTimer,
        pauseTimer,
        resetTimer,
      }}
    >
      {children}
    </TimerContext.Provider>
  );
}

export function useTimer() {
  return useContext(TimerContext);
}