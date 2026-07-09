const PREFIX = "teamcr7studio_";

export function saveData<T>(
  key: string,
  data: T
) {
  localStorage.setItem(
    PREFIX + key,
    JSON.stringify(data)
  );
}

export function loadData<T>(
  key: string,
  fallback: T
): T {
  const data = localStorage.getItem(PREFIX + key);

  if (!data) return fallback;

  try {
    return JSON.parse(data) as T;
  } catch {
    return fallback;
  }
}

export function removeData(key: string) {
  localStorage.removeItem(PREFIX + key);
}

export function clearAllData() {
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith(PREFIX)) {
      localStorage.removeItem(key);
    }
  });
}