"use client";

import { useLocalStorageState } from "@/hooks/useLocalStorageState";

export type DefaultExportFormat = "XLSX" | "CSV" | "PDF";
export type DataSourceMode = "Mock" | "Backend API" | "SQL Server Connector";

export type AppSettings = {
  workspaceName: string;
  companyName: string;
  userName: string;
  userEmail: string;
  defaultExportFormat: DefaultExportFormat;
  dataSourceMode: DataSourceMode;
};

export const initialAppSettings: AppSettings = {
  workspaceName: "Demo Workspace",
  companyName: "LoukPeri Client",
  userName: "Admin User",
  userEmail: "admin@client.com",
  defaultExportFormat: "XLSX",
  dataSourceMode: "Mock",
};

export function useAppSettings() {
  const [settings, setSettings] = useLocalStorageState<AppSettings>(
    "loukperi_demo_settings",
    initialAppSettings
  );

  return {
    settings,
    setSettings,
  };
}