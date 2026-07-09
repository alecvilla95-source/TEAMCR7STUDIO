import type {
  TeamCategory,
} from "./team";

export interface Player {
  id: string;

  teamId: number;

  teamName: string;

  category: TeamCategory;

  name: string;

  documentId: string;

  jerseyNumber: string;
}