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

  it("shows only useful table summary counts", () => {
    render(
      <LiveTablePage
        tables={[
          { id: "1", number: "P1", gameType: "POOL", status: "AVAILABLE", currentSession: null },
          { id: "2", number: "P2", gameType: "POOL", status: "RESERVED", currentSession: null },
          { id: "3", number: "S1", gameType: "SNOOKER", status: "OCCUPIED", currentSession: null },
          { id: "4", number: "S2", gameType: "SNOOKER", status: "CLEANING", currentSession: null },
          { id: "5", number: "S3", gameType: "SNOOKER", status: "MAINTENANCE", currentSession: null }
        ]}
      />
    );

    const counts = screen.getByLabelText("Table status counts");
    expect(counts).toHaveTextContent("Available");
    expect(counts).toHaveTextContent("Reserved");
    expect(counts).toHaveTextContent("Occupied");
    expect(counts).not.toHaveTextContent("Cleaning");
    expect(counts).not.toHaveTextContent("Maintenance");
    expect(counts).not.toHaveTextContent("Blocked");
  });
});
