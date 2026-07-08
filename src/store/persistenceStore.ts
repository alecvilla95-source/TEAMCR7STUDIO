import type { AppData } from "../types/appData";

import {
  loadData,
  saveData,
  clearData,
} from "../services/storage";

export function loadAppData(): AppData | null {
  return loadData<AppData>();
}

export function saveAppData(data: AppData) {
  saveData(data);
}

export function deleteAppData() {
  clearData();
}