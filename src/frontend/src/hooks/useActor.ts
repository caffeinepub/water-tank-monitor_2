import { useActor as useActorBase } from "@caffeineai/core-infrastructure";
import { createActor } from "../backend";
import type { backendInterface } from "../backend.d";

export function useActor(): {
  actor: backendInterface | null;
  isFetching: boolean;
} {
  return useActorBase(createActor);
}
