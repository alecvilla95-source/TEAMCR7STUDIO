const STORAGE_KEY = "teamcr7studio";

export function saveData(data: unknown) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(data)
  );
}

export function loadData<T>() {
  const data = localStorage.getItem(STORAGE_KEY);

  if (!data) return null;

  return JSON.parse(data) as T;
}

export function clearData() {
  localStorage.removeItem(STORAGE_KEY);
}