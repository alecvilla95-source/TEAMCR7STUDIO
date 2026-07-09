import React from "react";
import ReactDOM from "react-dom/client";

import "./global.css";
import "./print.css";

import App from "./App";

import { AppProvider } from "./store/appStore";
import { TeamProvider } from "./store/teamStore";
import { FixtureProvider } from "./store/fixtureStore";
import { TournamentProvider } from "./store/tournamentStore";
import { ChampionProvider } from "./store/championStore";
import { OverlayProvider } from "./store/overlayStore";
import { TimerProvider } from "./store/timerStore";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppProvider>
      <TournamentProvider>
        <TeamProvider>
          <FixtureProvider>
            <ChampionProvider>
              <OverlayProvider>
                <TimerProvider>
                  <App />
                </TimerProvider>
              </OverlayProvider>
            </ChampionProvider>
          </FixtureProvider>
        </TeamProvider>
      </TournamentProvider>
    </AppProvider>
  </React.StrictMode>
);