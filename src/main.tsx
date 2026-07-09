import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";

import "./global.css";
import "./print.css";

import { AppProvider } from "./store/appStore";
import { TournamentProvider } from "./store/tournamentStore";
import { TeamProvider } from "./store/teamStore";
import { FixtureProvider } from "./store/fixtureStore";
import { ChampionProvider } from "./store/championStore";
import { OverlayProvider } from "./store/overlayStore";
import { TimerProvider } from "./store/timerStore";
import { PlayerProvider } from "./store/playerStore";

ReactDOM.createRoot(
  document.getElementById("root")!
).render(
  <React.StrictMode>
    <AppProvider>
      <TournamentProvider>
        <TeamProvider>
          <FixtureProvider>
            <ChampionProvider>
              <OverlayProvider>
                <TimerProvider>
                  <PlayerProvider>
                    <App />
                  </PlayerProvider>
                </TimerProvider>
              </OverlayProvider>
            </ChampionProvider>
          </FixtureProvider>
        </TeamProvider>
      </TournamentProvider>
    </AppProvider>
  </React.StrictMode>
);