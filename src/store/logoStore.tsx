import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";

import {
  loadData,
  saveData,
} from "../services/storageService";

interface LogoContextType {
  logoDataUrl: string | null;

  setLogoDataUrl: (
    logo: string | null
  ) => void;
}

const LogoContext =
  createContext<LogoContextType>(
    {} as LogoContextType
  );

export function LogoProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [logoDataUrl, setLogoDataUrlState] =
    useState<string | null>(() =>
      loadData<string | null>(
        "logo",
        null
      )
    );

  function setLogoDataUrl(
    logo: string | null
  ) {
    setLogoDataUrlState(logo);

    saveData(
      "logo",
      logo
    );
  }

  return (
    <LogoContext.Provider
      value={{
        logoDataUrl,
        setLogoDataUrl,
      }}
    >
      {children}
    </LogoContext.Provider>
  );
}

export function useLogo() {
  return useContext(LogoContext);
}