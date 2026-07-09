import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import type { Match } from "../types/match";

import {
  loadData,
  saveData,
} from "../services/storageService";

interface FixtureContextType {
  fixture: Match[];

  setFixture: (fixture: Match[]) => void;
}

const FixtureContext =
  createContext<FixtureContextType>(
    {} as FixtureContextType
  );

const STORAGE_KEY = "teamcr7studio_fixture";

export function FixtureProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [fixture, setFixtureState] =
    useState<Match[]>(() =>
      loadData<Match[]>(
        "fixture",
        []
      )
    );

  function setFixture(fixture: Match[]) {
    setFixtureState(fixture);

    saveData(
      "fixture",
      fixture
    );
  }

  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key !== STORAGE_KEY) return;

      const updated = loadData<Match[]>(
        "fixture",
        []
      );

      setFixtureState(updated);
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
    <FixtureContext.Provider
      value={{
        fixture,
        setFixture,
      }}
    >
      {children}
    </FixtureContext.Provider>
  );
}

export function useFixture() {
  return useContext(FixtureContext);
}