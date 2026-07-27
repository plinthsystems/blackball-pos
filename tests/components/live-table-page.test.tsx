import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LiveTablePage } from "@/features/live-tables/components/live-table-page";

describe("LiveTablePage", () => {
  it("renders table states and primary session actions", () => {
    render(
      <LiveTablePage
        tables={[
          {
            id: "table_1",
            number: "P1",
            gameType: "POOL",
            status: "AVAILABLE",
            currentSession: null
          },
          {
            id: "table_2",
            number: "S1",
            gameType: "SNOOKER",
            status: "OCCUPIED",
            currentSession: {
              id: "session_1",
              status: "ACTIVE",
              customerName: "Riya Shah",
              plannedEndAt: "2026-07-23T11:00:00.000Z",
              billEstimate: 450,
              assignedStaffName: "Aarav Manager"
            }
          }
        ]}
      />
    );

    expect(screen.getByRole("heading", { name: "Live Tables" })).toBeInTheDocument();
    expect(screen.getByText("P1")).toBeInTheDocument();
    expect(screen.getByText("S1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start session for table P1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "End session for table S1" })).toBeInTheDocument();
  });

  it("shows status counts without relying on color alone", () => {
    render(
      <LiveTablePage
        tables={[
          { id: "1", number: "P1", gameType: "POOL", status: "AVAILABLE", currentSession: null },
          { id: "2", number: "P2", gameType: "POOL", status: "CLEANING", currentSession: null },
          { id: "3", number: "S1", gameType: "SNOOKER", status: "MAINTENANCE", currentSession: null }
        ]}
      />
    );

    expect(screen.getByText("Available")).toBeInTheDocument();
    expect(screen.getByText("Cleaning")).toBeInTheDocument();
    expect(screen.getByText("Maintenance")).toBeInTheDocument();
  });
});
