import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ChangePasswordPage from "@/app/(admin)/change-password/page";

const actions = vi.hoisted(() => ({
  changePasswordAction: vi.fn()
}));

vi.mock("@/features/auth/actions", () => ({
  changePasswordAction: actions.changePasswordAction
}));

describe("ChangePasswordPage", () => {
  beforeEach(() => {
    actions.changePasswordAction.mockReset();
  });

  it("rejects a too-short new password before calling the action", async () => {
    const user = userEvent.setup();

    render(<ChangePasswordPage />);
    await user.type(screen.getByLabelText("Current Password"), "oldpass");
    await user.type(screen.getByLabelText("New Password"), "123");
    await user.type(screen.getByLabelText("Confirm New Password"), "123");
    await user.keyboard("{Enter}");

    expect(
      screen.getByText("Naya password kam se kam 8 characters ka hona chahiye.")
    ).toBeInTheDocument();
    expect(actions.changePasswordAction).not.toHaveBeenCalled();
  });

  it("rejects when new and confirm passwords do not match", async () => {
    const user = userEvent.setup();

    render(<ChangePasswordPage />);
    await user.type(screen.getByLabelText("Current Password"), "oldpass");
    await user.type(screen.getByLabelText("New Password"), "newpass123");
    await user.type(screen.getByLabelText("Confirm New Password"), "different123");
    await user.keyboard("{Enter}");

    expect(
      screen.getByText("Naye aur confirm password match nahi kar rahe.")
    ).toBeInTheDocument();
    expect(actions.changePasswordAction).not.toHaveBeenCalled();
  });

  it("submits via Enter with valid inputs", async () => {
    const user = userEvent.setup();
    actions.changePasswordAction.mockResolvedValue({ ok: false, message: "Old password is wrong" });

    render(<ChangePasswordPage />);
    await user.type(screen.getByLabelText("Current Password"), "oldpass");
    await user.type(screen.getByLabelText("New Password"), "newpass123");
    await user.type(screen.getByLabelText("Confirm New Password"), "newpass123");
    await user.keyboard("{Enter}");

    expect(actions.changePasswordAction).toHaveBeenCalledWith({
      currentPassword: "oldpass",
      newPassword: "newpass123"
    });
    await waitFor(() => expect(screen.getByText("Old password is wrong")).toBeInTheDocument());
  });
});
