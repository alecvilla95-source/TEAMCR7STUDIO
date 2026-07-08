import React from "react";
import ReactDOM from "react-dom/client";

import "./global.css";

import App from "./App";

import { AppProvider } from "./store/appStore";
import { TeamProvider } from "./store/teamStore";
import { FixtureProvider } from "./store/fixtureStore";
import { TournamentProvider } from "./store/tournamentStore";
import { ChampionProvider } from "./store/championStore";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppProvider>
      <TournamentProvider>
        <TeamProvider>
          <FixtureProvider>
            <ChampionProvider>
              <App />
            </ChampionProvider>
          </FixtureProvider>
        </TeamProvider>
      </TournamentProvider>
    </AppProvider>
  </React.StrictMode>
);