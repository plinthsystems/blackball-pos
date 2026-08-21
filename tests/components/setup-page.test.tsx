import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import SetupPage from "@/app/setup/page";

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    organization: {
      count: vi.fn()
    }
  },
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn()
}));

vi.mock("@/components/ui/button", () => ({
  Button: (props: any) => <button {...props} />
}));

import { prisma } from "@/server/db/prisma";
import { redirect } from "next/navigation";

describe("SetupPage", () => {
  const mockPrisma = prisma as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should redirect to /login if organizations already exist", async () => {
    mockPrisma.organization.count.mockResolvedValue(1);

    await SetupPage({ searchParams: Promise.resolve({}) });

    expect(redirect).toHaveBeenCalledWith("/login");
  });

  it("should render the form if no organizations exist", async () => {
    mockPrisma.organization.count.mockResolvedValue(0);

    const result = await SetupPage({ searchParams: Promise.resolve({}) });

    // If it didn't redirect, it should return JSX
    expect(redirect).not.toHaveBeenCalled();
    expect(result).toBeTruthy();
    expect(result.props.children).toBeDefined();
  });
});