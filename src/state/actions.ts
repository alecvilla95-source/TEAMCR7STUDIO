export const ActionType = {

  CREATE_TOURNAMENT: "CREATE_TOURNAMENT",

  SET_TEAMS: "SET_TEAMS",

  SET_FIXTURE: "SET_FIXTURE",

  RESET: "RESET",

} as const;

export type ActionType =
  typeof ActionType[keyof typeof ActionType];
