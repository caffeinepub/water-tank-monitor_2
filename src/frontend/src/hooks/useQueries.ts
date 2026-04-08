import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Config } from "../backend.d";
import { useActor } from "./useActor";

export function useConfig() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["config"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getConfig();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useReadingHistory() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["history"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getReadings();
    },
    enabled: !!actor && !isFetching,
  });
}

/**
 * Fetches the water level from the ESP32/server endpoint via browser fetch(),
 * then persists the reading to the backend via addReading().
 * Returns the level as a number (0–100).
 */
export function useFetchWaterLevel() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      endpoint,
      threshold,
    }: {
      endpoint: string;
      threshold: number;
    }): Promise<number> => {
      if (!endpoint || endpoint.trim() === "") {
        throw new Error("No endpoint configured");
      }
      const res = await fetch(endpoint, { signal: AbortSignal.timeout(3000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      // Accept { level: number } or plain number
      const raw: number =
        typeof data === "number"
          ? data
          : typeof data?.level === "number"
            ? data.level
            : Number.parseFloat(String(data));
      if (Number.isNaN(raw)) throw new Error("Invalid data from endpoint");
      const level = Math.min(100, Math.max(0, Math.round(raw)));
      const status =
        level >= threshold
          ? "danger"
          : level >= threshold - 10
            ? "warning"
            : "normal";
      if (actor) {
        await actor.addReading(level, status);
      }
      return level;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["history"] });
    },
  });
}

export function useUpdateConfig() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (config: Config) => {
      if (!actor) throw new Error("No actor");
      return actor.updateConfig(config);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["config"] });
    },
  });
}

export function useAddManualReading() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      level,
      threshold,
    }: {
      level: number;
      threshold: number;
    }) => {
      if (!actor) throw new Error("No actor");
      const status =
        level >= threshold
          ? "danger"
          : level >= threshold - 10
            ? "warning"
            : "normal";
      return actor.addReading(level, status);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["history"] });
    },
  });
}
