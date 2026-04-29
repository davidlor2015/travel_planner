import { fireEvent, render } from "@testing-library/react-native";

import type { BudgetExpense } from "@/features/trips/budget/api";
import { BudgetTab } from "@/features/trips/workspace/BudgetTab";

const mockUseBudgetTracker = jest.fn();

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

jest.mock("@/features/trips/budget/hooks", () => ({
  useBudgetTracker: (...args: unknown[]) => mockUseBudgetTracker(...args),
}));

function makeExpense(overrides: Partial<BudgetExpense> = {}): BudgetExpense {
  return {
    id: 1,
    trip_id: 7,
    label: "Dinner in Trastevere",
    amount: 42.5,
    category: "food",
    created_at: "2026-04-28T19:30:00.000Z",
    ...overrides,
  };
}

function makeBudgetState(overrides: Partial<ReturnType<typeof baseBudgetState>> = {}) {
  return {
    ...baseBudgetState(),
    ...overrides,
  };
}

function baseBudgetState() {
  return {
    limit: null,
    expenses: [] as BudgetExpense[],
    totalSpent: 0,
    remaining: null,
    isOverBudget: false,
    loading: false,
    error: null as string | null,
    setLimit: jest.fn().mockResolvedValue(undefined),
    addExpense: jest.fn().mockResolvedValue(undefined),
    removeExpense: jest.fn().mockResolvedValue(undefined),
    reload: jest.fn(),
  };
}

describe("BudgetTab", () => {
  beforeEach(() => {
    mockUseBudgetTracker.mockReset();
  });

  it("renders the minimal empty state and hides category/history empty sections", () => {
    mockUseBudgetTracker.mockReturnValue(makeBudgetState());

    const { getByText, getByRole, queryByText } = render(<BudgetTab tripId={7} />);

    expect(getByText("Budget")).toBeTruthy();
    expect(getByText("Spent so far")).toBeTruthy();
    expect(getByText("Not set")).toBeTruthy();
    expect(getByRole("button", { name: "Set total budget" })).toBeTruthy();
    expect(getByRole("button", { name: "+ Add expense" })).toBeTruthy();
    expect(
      getByText("Categories and history will appear here once you log an expense."),
    ).toBeTruthy();

    expect(queryByText("Spending by category")).toBeNull();
    expect(queryByText("Recent transactions")).toBeNull();
    expect(queryByText("No expenses yet. Add one to start tracking spend.")).toBeNull();
  });

  it("opens the budget input sheet from Set total budget", () => {
    mockUseBudgetTracker.mockReturnValue(makeBudgetState());

    const { getByPlaceholderText, getByRole, getByText } = render(
      <BudgetTab tripId={7} />,
    );

    fireEvent.press(getByRole("button", { name: "Set total budget" }));

    expect(getByPlaceholderText("e.g. 2000")).toBeTruthy();
    expect(getByText("Save budget")).toBeTruthy();
  });

  it("opens the expense form sheet from Add expense", () => {
    mockUseBudgetTracker.mockReturnValue(makeBudgetState());

    const { getByRole, getByText } = render(<BudgetTab tripId={7} />);

    fireEvent.press(getByRole("button", { name: "+ Add expense" }));

    expect(getByText("Label")).toBeTruthy();
    expect(getByText("Amount")).toBeTruthy();
    expect(getByText("Save expense")).toBeTruthy();
  });

  it("shows category breakdown and recent transactions after expenses exist", () => {
    mockUseBudgetTracker.mockReturnValue(
      makeBudgetState({
        expenses: [makeExpense()],
        totalSpent: 42.5,
      }),
    );

    const { getAllByText, getByText, queryByText } = render(<BudgetTab tripId={7} />);

    expect(getByText("Spending by category")).toBeTruthy();
    expect(getByText("Recent transactions")).toBeTruthy();
    expect(getByText("Dinner in Trastevere")).toBeTruthy();
    expect(getAllByText("Food").length).toBeGreaterThan(0);
    expect(
      queryByText("Categories and history will appear here once you log an expense."),
    ).toBeNull();
  });
});
