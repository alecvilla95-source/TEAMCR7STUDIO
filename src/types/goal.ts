import type { TeamCategory } from "./team";

export interface GoalScorerRecord {
  id: string;

  matchId: number;

  teamId: number;

  teamName: string;

  playerId: string;

  playerName: string;

  category: TeamCategory;

  courtLabel: string;

  goals: number;
}