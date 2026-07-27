import { SessionService } from "@/server/services/session-service";
import { createHarnessRepositories, createStore } from "./in-memory-store";

export function createSessionServiceForTests() {
  const store = createStore();
  const repositories = createHarnessRepositories(store);
  const service = new SessionService(
    repositories.tables,
    repositories.sessions,
    repositories.auditLogs,
    repositories.events,
    repositories.transaction
  );

  return { service, store };
}
