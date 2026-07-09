export type TeamCategory =
  | "MEN"
  | "WOMEN";

export interface Team {
  id: number;

  name: string;

  assignedCourt?: number;

  category?: TeamCategory;

  delegate1?: string;

  delegate2?: string;
}