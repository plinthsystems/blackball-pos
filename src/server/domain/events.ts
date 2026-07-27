export type DomainEventName =
  | "table.status_changed"
  | "session.started"
  | "session.paused"
  | "session.resumed"
  | "session.extended"
  | "session.ended";

export type DomainEvent = {
  name: DomainEventName;
  businessId: string;
  entityId: string;
  payload: Record<string, unknown>;
};

export type DomainEventPublisher = {
  publish(event: DomainEvent): Promise<void>;
};

export const noopDomainEventPublisher: DomainEventPublisher = {
  async publish() {
    return undefined;
  }
};
