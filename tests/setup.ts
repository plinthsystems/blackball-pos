import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
    push: vi.fn(),
    replace: vi.fn(),
    scrollTo: vi.fn()
  }),
  // Real mocks (vi.fn) so tests can override per-case with vi.mocked(usePathname).
  usePathname: vi.fn(() => "/dashboard")
}));

// Mock DOM element scrollTo to prevent unhandled errors from router navigation
Element.prototype.scrollTo = vi.fn();
