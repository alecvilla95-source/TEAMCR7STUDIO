import {
  createContext,
  useContext,
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