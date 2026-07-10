import { useApp } from "./store/appStore";

import MainLayout from "./components/layout/MainLayout";

import Dashboard from "./features/dashboard/Dashboard";
import TournamentForm from "./features/tournament/TournamentForm";
import TeamRegistration from "./features/teams/TeamRegistration";
import PlayersView from "./features/players/PlayersView";
import FixtureView from "./features/fixture/FixtureView";
import ResultsView from "./features/results/ResultsView";
import OverlayView from "./features/overlay/OverlayView";
import SettingsView from "./features/settings/SettingsView";

export default function App() {
  const { page } = useApp();

  if (page === "overlay") {
    return <OverlayView />;
  }

  function renderPage() {
    if (page === "dashboard") {
      return <Dashboard />;
    }

    if (page === "tournament") {
      return <TournamentForm />;
    }

    if (page === "teams") {
      return <TeamRegistration />;
    }

    if (page === "players") {
      return <PlayersView />;
    }

    if (page === "fixture") {
      return <FixtureView />;
    }

    if (page === "results") {
      return <ResultsView />;
    }

    if (page === "settings") {
      return <SettingsView />;
    }

    return <Dashboard />;
  }

  return (
    <MainLayout>
      {renderPage()}
    </MainLayout>
  );
}