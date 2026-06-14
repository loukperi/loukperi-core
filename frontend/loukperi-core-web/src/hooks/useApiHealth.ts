"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet } from "@/lib/apiClient";

type ApiHealthStatus = "checking" | "online" | "offline";

export function useApiHealth() {
  const [status, setStatus] = useState<ApiHealthStatus>("checking");
  const [message, setMessage] = useState("Checking backend connection...");
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null);

  const checkHealth = useCallback(async () => {
    try {
      setStatus("checking");
      setMessage("Checking backend connection...");

      await apiGet<unknown>("/health", {
        auth: false,
        unwrapData: false,
      });

      setStatus("online");
      setMessage("Backend API is reachable.");
      setLastCheckedAt(
        new Intl.DateTimeFormat("el-GR", {
          timeStyle: "medium",
        }).format(new Date())
      );
    } catch {
      setStatus("offline");
      setMessage("Backend API is not reachable.");
      setLastCheckedAt(
        new Intl.DateTimeFormat("el-GR", {
          timeStyle: "medium",
        }).format(new Date())
      );
    }
  }, []);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  return {
    status,
    message,
    lastCheckedAt,
    recheck: checkHealth,
    isChecking: status === "checking",
    isOnline: status === "online",
    isOffline: status === "offline",
  };
}