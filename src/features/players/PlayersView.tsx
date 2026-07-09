import {
  useRef,
  useState,
  type CSSProperties,
} from "react";

import type { Team } from "../../types/team";
import type { Player } from "../../types/player";

import { useTournament } from "../../store/tournamentStore";
import { useTeams } from "../../store/teamStore";
import { usePlayers } from "../../store/playerStore";

import {
  exportPlayerTemplate,
  exportAllPlayerTemplates,
  importPlayersFromExcel,
  importAllPlayersFromExcel,
} from "../../services/excelService";

function getCategoryColor(team: Team) {
  if (team.category === "WOMEN") {
    return "#f9a8d4";
  }

  return "#93c5fd";
}

function getCategoryLabel(team: Team) {
  if (team.category === "WOMEN") {
    return "MUJERES";
  }

  return "VARONES";
}

function getCourtLabel(team: Team) {
  if (team.category === "WOMEN") {
    return `C. Mujer ${team.assignedCourt ?? "-"}`;
  }

  return `Cancha ${team.assignedCourt ?? "-"}`;
}

export default function PlayersView() {
  const { tournament } = useTournament();

  const { teams } = useTeams();

  const {
    players,
    setPlayers,
    getPlayersByTeam,
    setPlayersForTeam,
  } = usePlayers();

  const [expandedTeamId, setExpandedTeamId] =
    useState<number | null>(null);

  const fileRefs =
    useRef<Record<number, HTMLInputElement | null>>({});

  const allUploadRef =
    useRef<HTMLInputElement | null>(null);

  const menTeams = teams.filter(
    (team) => team.category !== "WOMEN"
  );

  const womenTeams = teams.filter(
    (team) => team.category === "WOMEN"
  );

  function downloadTemplate(team: Team) {
    exportPlayerTemplate({
      tournamentName: tournament?.name ?? "Campeonato",
      team,
      maxPlayers: 25,
    });
  }

  function downloadAllTemplates() {
    if (teams.length === 0) {
      alert("No hay equipos registrados.");
      return;
    }

    exportAllPlayerTemplates({
      tournamentName: tournament?.name ?? "Campeonato",
      teams,
      maxPlayers: 25,
    });
  }

  async function uploadAllTemplates(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    try {
      const imported = await importAllPlayersFromExcel(
        file,
        teams
      );

      if (imported.length === 0) {
        alert(
          "No se encontró ninguna ficha válida. Asegúrate de no borrar las filas de Equipo, Categoría y Cancha."
        );
        return;
      }

      const importedTeamIds = new Set(
        imported.map((item) => item.team.id)
      );

      const newPlayers = imported.flatMap(
        (item) => item.players
      );

      const remainingPlayers = players.filter(
        (player) => !importedTeamIds.has(player.teamId)
      );

      setPlayers([
        ...remainingPlayers,
        ...newPlayers,
      ]);

      alert(
        `${newPlayers.length} jugadores importados en ${imported.length} equipos.`
      );
    } catch {
      alert(
        "No se pudo leer el Excel con todas las fichas."
      );
    } finally {
      event.target.value = "";
    }
  }

  async function uploadTemplate(
    event: React.ChangeEvent<HTMLInputElement>,
    team: Team
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    try {
      const players = await importPlayersFromExcel(
        file,
        team
      );

      setPlayersForTeam(team.id, players);

      alert(
        `${players.length} jugadores importados para ${team.name}.`
      );
    } catch {
      alert(
        "No se pudo leer la ficha Excel de jugadores."
      );
    } finally {
      event.target.value = "";
    }
  }

  return (
    <div>
      <div style={headerBox}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 20,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div>
            <h2
              style={{
                marginTop: 0,
              }}
            >
              👥 Registro de Jugadores
            </h2>

            <h1
              style={{
                marginTop: 0,
                fontSize: 34,
              }}
            >
              {tournament?.name ?? "TEAMCR7STUDIO"}
            </h1>

            <p
              style={{
                color: "#94a3b8",
                marginBottom: 0,
              }}
            >
              Descarga las fichas Excel, entrégalas para que las rellenen y
              luego súbelas al sistema.
            </p>
          </div>

          <div style={headerActions}>
            <button
              onClick={downloadAllTemplates}
              style={allDownloadButton}
            >
              📥 Descargar todas las fichas Excel
            </button>

            <input
              ref={allUploadRef}
              type="file"
              accept=".xlsx,.xls"
              style={{
                display: "none",
              }}
              onChange={uploadAllTemplates}
            />

            <button
              onClick={() => allUploadRef.current?.click()}
              style={allUploadButton}
            >
              📤 Subir todas las fichas llenas
            </button>
          </div>
        </div>
      </div>

      <div style={summaryGrid}>
        <SummaryBox
          title="Equipos Varones"
          value={menTeams.length}
          color="#93c5fd"
        />

        <SummaryBox
          title="Equipos Mujeres"
          value={womenTeams.length}
          color="#f9a8d4"
        />

        <SummaryBox
          title="Equipos Totales"
          value={teams.length}
          color="#facc15"
        />
      </div>

      <TeamSection
        title="⚽ VARONES"
        teams={menTeams}
        color="#93c5fd"
        expandedTeamId={expandedTeamId}
        setExpandedTeamId={setExpandedTeamId}
        fileRefs={fileRefs}
        getPlayersByTeam={getPlayersByTeam}
        onDownload={downloadTemplate}
        onUpload={uploadTemplate}
      />

      {womenTeams.length > 0 && (
        <TeamSection
          title="👩 MUJERES"
          teams={womenTeams}
          color="#f9a8d4"
          expandedTeamId={expandedTeamId}
          setExpandedTeamId={setExpandedTeamId}
          fileRefs={fileRefs}
          getPlayersByTeam={getPlayersByTeam}
          onDownload={downloadTemplate}
          onUpload={uploadTemplate}
        />
      )}
    </div>
  );
}

function TeamSection({
  title,
  teams,
  color,
  expandedTeamId,
  setExpandedTeamId,
  fileRefs,
  getPlayersByTeam,
  onDownload,
  onUpload,
}: {
  title: string;
  teams: Team[];
  color: string;
  expandedTeamId: number | null;
  setExpandedTeamId: (teamId: number | null) => void;
  fileRefs: React.MutableRefObject<
    Record<number, HTMLInputElement | null>
  >;
  getPlayersByTeam: (teamId: number) => Player[];
  onDownload: (team: Team) => void;
  onUpload: (
    event: React.ChangeEvent<HTMLInputElement>,
    team: Team
  ) => void;
}) {
  const grouped = groupTeamsByCourt(teams);

  return (
    <section
      style={{
        marginTop: 30,
      }}
    >
      <h2
        style={{
          color,
          borderBottom: "3px solid #334155",
          paddingBottom: 12,
        }}
      >
        {title}
      </h2>

      {grouped.map((group) => (
        <div
          key={group.label}
          style={{
            marginTop: 25,
          }}
        >
          <h3
            style={{
              color,
            }}
          >
            🏟 {group.label}
          </h3>

          <div style={teamGrid}>
            {group.teams.map((team) => {
              const players = getPlayersByTeam(team.id);

              const expanded =
                expandedTeamId === team.id;

              return (
                <TeamPlayerCard
                  key={team.id}
                  team={team}
                  players={players}
                  color={color}
                  expanded={expanded}
                  onToggle={() =>
                    setExpandedTeamId(
                      expanded ? null : team.id
                    )
                  }
                  fileInputRef={(element) => {
                    fileRefs.current[team.id] = element;
                  }}
                  onDownload={() => onDownload(team)}
                  onUploadClick={() =>
                    fileRefs.current[team.id]?.click()
                  }
                  onUpload={(event) =>
                    onUpload(event, team)
                  }
                />
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}

function TeamPlayerCard({
  team,
  players,
  color,
  expanded,
  onToggle,
  fileInputRef,
  onDownload,
  onUploadClick,
  onUpload,
}: {
  team: Team;
  players: Player[];
  color: string;
  expanded: boolean;
  onToggle: () => void;
  fileInputRef: (
    element: HTMLInputElement | null
  ) => void;
  onDownload: () => void;
  onUploadClick: () => void;
  onUpload: (
    event: React.ChangeEvent<HTMLInputElement>
  ) => void;
}) {
  return (
    <div
      style={{
        background: "#1e293b",
        border: `1px solid ${color}`,
        borderRadius: 14,
        padding: 18,
      }}
    >
      <div
        style={{
          color,
          fontWeight: "bold",
          marginBottom: 8,
        }}
      >
        {getCategoryLabel(team)} | {getCourtLabel(team)}
      </div>

      <h3
        style={{
          marginTop: 0,
          fontSize: 24,
        }}
      >
        {team.name}
      </h3>

      <p
        style={{
          color: "#94a3b8",
        }}
      >
        Jugadores registrados:{" "}
        <strong>{players.length}</strong>
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        style={{
          display: "none",
        }}
        onChange={onUpload}
      />

      <div style={buttonGrid}>
        <button
          onClick={onDownload}
          style={downloadButton}
        >
          📥 Descargar ficha Excel
        </button>

        <button
          onClick={onUploadClick}
          style={uploadButton}
        >
          📤 Subir ficha llena
        </button>

        <button
          onClick={onToggle}
          style={secondaryButton}
        >
          {expanded
            ? "Ocultar jugadores"
            : "Ver jugadores"}
        </button>
      </div>

      {expanded && (
        <PlayersTable players={players} />
      )}
    </div>
  );
}

function PlayersTable({
  players,
}: {
  players: Player[];
}) {
  if (players.length === 0) {
    return (
      <div style={emptyBox}>
        Todavía no hay jugadores cargados para este equipo.
      </div>
    );
  }

  return (
    <div
      style={{
        marginTop: 18,
        overflowX: "auto",
      }}
    >
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>N°</th>
            <th style={thStyle}>Jugador</th>
            <th style={thStyle}>Documento</th>
            <th style={thStyle}>Dorsal</th>
          </tr>
        </thead>

        <tbody>
          {players.map((player, index) => (
            <tr key={player.id}>
              <td style={tdStyle}>
                {index + 1}
              </td>

              <td style={tdStyle}>
                {player.name}
              </td>

              <td style={tdStyle}>
                {player.documentId}
              </td>

              <td style={tdStyle}>
                {player.jerseyNumber}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SummaryBox({
  title,
  value,
  color,
}: {
  title: string;
  value: number;
  color: string;
}) {
  return (
    <div
      style={{
        background: "#1e293b",
        border: `1px solid ${color}`,
        borderRadius: 14,
        padding: 18,
      }}
    >
      <div
        style={{
          color,
          fontWeight: "bold",
          marginBottom: 8,
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: 30,
          fontWeight: "bold",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function groupTeamsByCourt(teams: Team[]) {
  const map = new Map<number, Team[]>();

  teams.forEach((team) => {
    const court = team.assignedCourt ?? 0;

    if (!map.has(court)) {
      map.set(court, []);
    }

    map.get(court)!.push(team);
  });

  return Array.from(map.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([court, list]) => {
      const firstTeam = list[0];

      const label =
        court === 0
          ? "Sin cancha"
          : firstTeam?.category === "WOMEN"
          ? `C. Mujer ${court}`
          : `Cancha ${court}`;

      return {
        label,
        teams: list,
      };
    });
}

const headerBox: CSSProperties = {
  background: "#1e293b",
  border: "1px solid #334155",
  borderRadius: 14,
  padding: 25,
  marginBottom: 25,
};

const headerActions: CSSProperties = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
};

const summaryGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 15,
};

const teamGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(340px, 1fr))",
  gap: 18,
};

const buttonGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(170px, 1fr))",
  gap: 10,
};

const allDownloadButton: CSSProperties = {
  padding: "14px 18px",
  background: "#f97316",
  color: "white",
  border: "none",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: "bold",
};

const allUploadButton: CSSProperties = {
  padding: "14px 18px",
  background: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: "bold",
};

const downloadButton: CSSProperties = {
  padding: "12px",
  background: "#16a34a",
  color: "white",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: "bold",
};

const uploadButton: CSSProperties = {
  padding: "12px",
  background: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: "bold",
};

const secondaryButton: CSSProperties = {
  padding: "12px",
  background: "#334155",
  color: "white",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: "bold",
};

const emptyBox: CSSProperties = {
  marginTop: 18,
  background: "#0f172a",
  border: "1px solid #334155",
  borderRadius: 10,
  padding: 14,
  color: "#94a3b8",
};

const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
};

const thStyle: CSSProperties = {
  background: "#0f172a",
  border: "1px solid #334155",
  padding: 10,
  textAlign: "left",
  color: "#93c5fd",
};

const tdStyle: CSSProperties = {
  border: "1px solid #334155",
  padding: 10,
};