import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";

import type { Player } from "../types/player";

import {
  loadData,
  saveData,
} from "../services/storageService";

interface PlayerContextType {
  players: Player[];

  setPlayers: (players: Player[]) => void;

  setPlayersForTeam: (
    teamId: number,
    players: Player[]
  ) => void;

  getPlayersByTeam: (
    teamId: number
  ) => Player[];

  clearPlayers: () => void;
}

const PlayerContext =
  createContext<PlayerContextType>(
    {} as PlayerContextType
  );

export function PlayerProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [players, setPlayersState] =
    useState<Player[]>(() =>
      loadData<Player[]>(
        "players",
        []
      )
    );

  function savePlayers(
    nextPlayers: Player[]
  ) {
    setPlayersState(nextPlayers);

    saveData(
      "players",
      nextPlayers
    );
  }

  function setPlayers(
    nextPlayers: Player[]
  ) {
    savePlayers(nextPlayers);
  }

  function setPlayersForTeam(
    teamId: number,
    newPlayers: Player[]
  ) {
    const otherPlayers =
      players.filter(
        (player) => player.teamId !== teamId
      );

    savePlayers([
      ...otherPlayers,
      ...newPlayers,
    ]);
  }

  function getPlayersByTeam(
    teamId: number
  ) {
    return players.filter(
      (player) => player.teamId === teamId
    );
  }

  function clearPlayers() {
    savePlayers([]);
  }

  return (
    <PlayerContext.Provider
      value={{
        players,
        setPlayers,
        setPlayersForTeam,
        getPlayersByTeam,
        clearPlayers,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayers() {
  return useContext(PlayerContext);
}