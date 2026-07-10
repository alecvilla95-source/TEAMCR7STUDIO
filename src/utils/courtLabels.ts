export function getMenFieldLabel(index: number) {
  return `Campo ${index}`;
}

export function getWomenFieldLabel(index: number) {
  const letters = ["A", "B", "C", "D"];
  return `Campo ${letters[index - 1] ?? index}`;
}

export function formatCourtName(
  value: string | number | null | undefined
) {
  if (value === null || value === undefined) {
    return "Sin campo";
  }

  const text = String(value).trim();

  const womenMap: Record<string, string> = {
    "C. Mujer 1": "Campo A",
    "C. Mujer 2": "Campo B",
    "C. Mujer 3": "Campo C",
    "C. Mujer 4": "Campo D",
    "Campo A": "Campo A",
    "Campo B": "Campo B",
    "Campo C": "Campo C",
    "Campo D": "Campo D",
  };

  if (womenMap[text]) {
    return womenMap[text];
  }

  const menMatch = text.match(/(?:Cancha|Campo)\s*(\d+)/i);

  if (menMatch) {
    return `Campo ${menMatch[1]}`;
  }

  return text;
}