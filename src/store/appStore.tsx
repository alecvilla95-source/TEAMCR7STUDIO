import { createContext, useContext, useState, type ReactNode } from "react";

export type Page =
  | "dashboard"
  | "tournament"
  | "teams"
  | "fixture"
  | "results"
  | "overlay"
  | "settings";

interface AppContextType {
  page: Page;
  setPage: (page: Page) => void;
}

const AppContext = createContext<AppContextType>(
  {} as AppContextType
);

export function AppProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [page, setPage] = useState<Page>("dashboard");

  return (
    <AppContext.Provider
      value={{
        page,
        setPage,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}