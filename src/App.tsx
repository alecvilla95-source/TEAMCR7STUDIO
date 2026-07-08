import { useApp } from "./store/appStore";

import MainLayout from "./components/layout/MainLayout";

import Dashboard from "./features/dashboard/Dashboard";
import TournamentForm from "./features/tournament/TournamentForm";
import TeamRegistration from "./features/teams/TeamRegistration";
import FixtureView from "./features/fixture/FixtureView";
import ResultsView from "./features/results/ResultsView";

export default function App() {
  const { page } = useApp();

  let title = "";
  let content = null;

  switch (page) {
    case "dashboard":
      title = "Dashboard";
      content = <Dashboard />;
      break;

    case "tournament":
      title = "Nuevo Campeonato";
      content = <TournamentForm />;
      break;

    case "teams":
      title = "Registro de Equipos";
      content = <TeamRegistration />;
      break;

    case "fixture":
      title = "Fixture";
      content = <FixtureView />;
      break;

    case "results":
      title = "Resultados";
      content = <ResultsView />;
      break;

    case "overlay":
      title = "Overlay OBS";
      content = <h2>Próximamente...</h2>;
      break;

    case "settings":
      title = "Configuración";
      content = <h2>Próximamente...</h2>;
      break;

    default:
      title = "Dashboard";
      content = <Dashboard />;
      break;
  }

  return (
    <MainLayout title={title}>
      {content}
    </MainLayout>
  );
}