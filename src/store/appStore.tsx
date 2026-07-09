import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";

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

const validPages: Page[] = [
  "dashboard",
  "tournament",
  "teams",
  "fixture",
  "results",
  "overlay",
  "settings",
];

function getInitialPage(): Page {
  const params = new URLSearchParams(
    window.location.search
  );

  const page = params.get("page") as Page | null;

  if (page && validPages.includes(page)) {
    return page;
  }

  return "dashboard";
}

const AppContext = createContext<AppContextType>(
  {} as AppContextType
);

export function AppProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [page, setPageState] =
    useState<Page>(getInitialPage);

  function setPage(page: Page) {
    setPageState(page);

    const url = new URL(window.location.href);

    if (page === "dashboard") {
      url.searchParams.delete("page");
    } else {
      url.searchParams.set("page", page);
    }

    window.history.pushState(
      {},
      "",
      url.toString()
    );
  }

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