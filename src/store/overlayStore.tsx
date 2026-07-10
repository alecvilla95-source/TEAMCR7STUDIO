import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

interface OverlayContextValue {
  activeMatchId: number | null;
  setActiveMatchId: (matchId: number | null) => void;
}

const OverlayContext = createContext<OverlayContextValue | null>(null);

const STORAGE_KEY = "teamcr7studio_active_match_id";

function readStoredActiveMatchId() {
  const value = localStorage.getItem(STORAGE_KEY);

  if (!value) return null;

  const parsed = Number(value);

  if (Number.isNaN(parsed)) return null;

  return parsed;
}

export function OverlayProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [activeMatchId, setActiveMatchIdState] =
    useState<number | null>(() => readStoredActiveMatchId());

  function setActiveMatchId(matchId: number | null) {
    setActiveMatchIdState(matchId);

    if (matchId === null) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    localStorage.setItem(STORAGE_KEY, String(matchId));
  }

  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key !== STORAGE_KEY) return;

      setActiveMatchIdState(readStoredActiveMatchId());
    }

    function handleFocus() {
      setActiveMatchIdState(readStoredActiveMatchId());
    }

    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  return (
    <OverlayContext.Provider
      value={{
        activeMatchId,
        setActiveMatchId,
      }}
    >
      {children}
    </OverlayContext.Provider>
  );
}

export function useOverlay() {
  const context = useContext(OverlayContext);

  if (!context) {
    throw new Error(
      "useOverlay debe usarse dentro de OverlayProvider"
    );
  }

  return context;
}