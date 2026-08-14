import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { StartWalkInDialog } from "@/features/sessions/components/start-walk-in-dialog";

describe("StartWalkInDialog", () => {
  it("shows validation feedback for missing required fields", async () => {
    const user = userEvent.setup();

    render(<StartWalkInDialog tableId="table_1" tableNumber="P1" open onOpenChange={() => undefined} />);
    await user.click(screen.getByRole("button", { name: "Start session" }));

    expect(screen.getByText("Choose a duration.")).toBeInTheDocument();
  });

  it("shows PS5 member choices and a rate preview", async () => {
    const user = userEvent.setup();

    render(<StartWalkInDialog tableId="ps5_1" tableNumber="PS5 1" gameType="PS5" hourlyRate={100} open onOpenChange={() => undefined} />);

    await user.selectOptions(screen.getByLabelText("Members"), "4");

    expect(screen.getByText("PS5 rate: ₹250.00/hr")).toBeInTheDocument();
  });
});
