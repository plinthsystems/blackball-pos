import { TableService } from "@/server/services/table-service";
import { createHarnessRepositories, createStore } from "./in-memory-store";

export function createTableServiceForTests() {
  const store = createStore();
  const repositories = createHarnessRepositories(store);
  const service = new TableService(
    repositories.tables,
    repositories.auditLogs,
    repositories.events,
    repositories.transaction
  );

  return { service, store };
}
