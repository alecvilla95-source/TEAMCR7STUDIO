export function getRoundName(
  teams: number
): string {

  switch (teams) {

    case 2:
      return "FINAL";

    case 4:
      return "SEMIFINAL";

    case 8:
      return "CUARTOS DE FINAL";

    case 16:
      return "OCTAVOS DE FINAL";

    case 32:
      return "DIECISEISAVOS DE FINAL";

    case 64:
      return "TREINTAIDOSAVOS DE FINAL";

    case 128:
      return "SESENTAICUATROAVOS DE FINAL";

    default:
      return `RONDA DE ${teams} EQUIPOS`;

  }

}