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

interface OverlayContextType {
  activeMatchId: number | null;
  setActiveMatchId: (id: number | null) => void;
}

const OverlayContext =
  createContext<OverlayContextType>(
    {} as OverlayContextType
  );

const STORAGE_KEY =
  "teamcr7studio_activeMatchId";

export function OverlayProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [activeMatchId, setActiveMatchIdState] =
    useState<number | null>(() =>
      loadData<number | null>(
        "activeMatchId",
        null
      )
    );

  function setActiveMatchId(id: number | null) {
    setActiveMatchIdState(id);

    saveData(
      "activeMatchId",
      id
    );
  }

  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key !== STORAGE_KEY) return;

      const updated = loadData<number | null>(
        "activeMatchId",
        null
      );

      setActiveMatchIdState(updated);
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
  return useContext(OverlayContext);
}