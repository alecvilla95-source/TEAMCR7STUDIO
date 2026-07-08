import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";

import type { Match } from "../types/match";

interface FixtureContextType {

  fixture: Match[];

  setFixture: (
    fixture: Match[]
  ) => void;

}

const FixtureContext =
createContext<FixtureContextType>(
{} as FixtureContextType
);

export function FixtureProvider({
children,
}:{
children:ReactNode;
}){

const[
fixture,
setFixture
]=useState<Match[]>([]);

return(

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

export function useFixture(){

return useContext(
FixtureContext
);

}