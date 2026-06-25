import { useState, useEffect, useMemo, useRef } from "react";
import {
  Plus,
  X,
  Check,
  ArrowRight,
  Receipt,
  Users,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Member {
  id: string;
  name: string;
  color: string;
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  paidById: string;
  splitAmong: string[];
  date: string;
  category: string;
}

interface Settlement {
  fromId: string;
  toId: string;
  amount: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MEMBER_COLORS = [
  "#f97316", // orange
  "#06b6d4", // cyan
  "#8b5cf6", // violet
  "#10b981", // emerald
  "#f43f5e", // rose
  "#eab308", // yellow
  "#3b82f6", // blue
  "#ec4899", // pink
];

const CATEGORIES = [
  "Food & Drink",
  "Accommodation",
  "Transport",
  "Entertainment",
  "Utilities",
  "Groceries",
  "Travel",
  "Other",
];

const CATEGORY_EMOJI: Record<string, string> = {
  "Food & Drink": "🍽",
  Accommodation: "🏠",
  Transport: "🚕",
  Entertainment: "🎭",
  Utilities: "💡",
  Groceries: "🛒",
  Travel: "✈️",
  Other: "📌",
};

const CATEGORY_SHORT: Record<string, string> = {
  "Food & Drink": "Food",
  Accommodation: "Lodging",
  Transport: "Transport",
  Entertainment: "Fun",
  Utilities: "Utilities",
  Groceries: "Groceries",
  Travel: "Travel",
  Other: "Other",
};

// ─── Utilities ────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function computeBalances(members: Member[], expenses: Expense[]): Record<string, number> {
  const b: Record<string, number> = {};
  members.forEach((m) => (b[m.id] = 0));
  expenses.forEach((e) => {
    if (!e.splitAmong.length) return;
    const share = e.amount / e.splitAmong.length;
    b[e.paidById] = (b[e.paidById] || 0) + e.amount;
    e.splitAmong.forEach((id) => {
      b[id] = (b[id] || 0) - share;
    });
  });
  return b;
}

function computeSettlements(balances: Record<string, number>): Settlement[] {
  const settlements: Settlement[] = [];
  const creditors = Object.entries(balances)
    .filter(([, v]) => v > 0.01)
    .map(([id, amount]) => ({ id, amount }))
    .sort((a, b) => b.amount - a.amount);
  const debtors = Object.entries(balances)
    .filter(([, v]) => v < -0.01)
    .map(([id, amount]) => ({ id, amount: -amount }))
    .sort((a, b) => b.amount - a.amount);

  let i = 0,
    j = 0;
  while (i < creditors.length && j < debtors.length) {
    const credit = creditors[i];
    const debt = debtors[j];
    const amount = Math.round(Math.min(credit.amount, debt.amount) * 100) / 100;
    settlements.push({ fromId: debt.id, toId: credit.id, amount });
    credit.amount -= amount;
    debt.amount -= amount;
    if (credit.amount < 0.01) i++;
    if (debt.amount < 0.01) j++;
  }
  return settlements;
}

// ─── Subcomponents ────────────────────────────────────────────────────────────

function Avatar({ name, color, size = "md" }: { name: string; color: string; size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "w-7 h-7 text-xs", md: "w-9 h-9 text-sm", lg: "w-11 h-11 text-base" };
  return (
    <div
      className={`${sizes[size]} rounded-full flex items-center justify-center font-bold text-white flex-shrink-0`}
      style={{ background: color }}
    >
      {name[0].toUpperCase()}
    </div>
  );
}

function Badge({ children, variant = "default" }: { children: React.ReactNode; variant?: "default" | "success" | "danger" | "neutral" }) {
  const styles = {
    default: "bg-secondary text-secondary-foreground",
    success: "bg-emerald-50 text-emerald-700",
    danger: "bg-red-50 text-red-600",
    neutral: "bg-muted text-muted-foreground",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${styles[variant]}`}>
      {children}
    </span>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

type Tab = "expenses" | "balances" | "settle";

interface ExpenseFormState {
  description: string;
  amount: string;
  paidById: string;
  splitAmong: string[];
  category: string;
  date: string;
}

interface SavedAppState {
  members: Member[];
  expenses: Expense[];
  activeTab: Tab;
  appliedSettlements: Settlement[];
  tripName: string;
  expenseForm: ExpenseFormState;
  newMemberName: string;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const STORAGE_KEY = "ambagapp-state";

function loadSavedAppState(): SavedAppState | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SavedAppState;
  } catch {
    return null;
  }
}

function getDefaultExpenseForm(): ExpenseFormState {
  return {
    description: "",
    amount: "",
    paidById: "",
    splitAmong: [],
    category: "Other",
    date: new Date().toISOString().split("T")[0],
  };
}

export default function App() {
  const savedState = loadSavedAppState();
  const [members, setMembers] = useState<Member[]>(savedState?.members ?? []);
  const [expenses, setExpenses] = useState<Expense[]>(savedState?.expenses ?? []);
  const [activeTab, setActiveTab] = useState<Tab>(savedState?.activeTab ?? "expenses");
  const [appliedSettlements, setAppliedSettlements] = useState<Settlement[]>(savedState?.appliedSettlements ?? []);
  const [tripName, setTripName] = useState(savedState?.tripName ?? "");

  // Modals
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [expandedExpenseId, setExpandedExpenseId] = useState<string | null>(null);

  // Add expense form
  const [expenseForm, setExpenseForm] = useState<ExpenseFormState>(savedState?.expenseForm ?? getDefaultExpenseForm());

  const [newMemberName, setNewMemberName] = useState(savedState?.newMemberName ?? "");

  // Refs
  const descRef = useRef<HTMLInputElement | null>(null);
  const amountRef = useRef<HTMLInputElement | null>(null);
  const dateRef = useRef<HTMLInputElement | null>(null);
  const firstPayerRef = useRef<HTMLButtonElement | null>(null);
  const addExpenseBtnRef = useRef<HTMLButtonElement | null>(null);
  const addMemberBtnRef = useRef<HTMLButtonElement | null>(null);
  const tripNameRef = useRef<HTMLInputElement | null>(null);

  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [showAndroidInstallInstructions, setShowAndroidInstallInstructions] = useState(false);
  const [isAndroidDevice, setIsAndroidDevice] = useState(false);
  const [isStandaloneMode, setIsStandaloneMode] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredInstallPrompt(event as BeforeInstallPromptEvent);
      setShowInstallBanner(true);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  useEffect(() => {
    const state: SavedAppState = {
      members,
      expenses,
      activeTab,
      appliedSettlements,
      tripName,
      expenseForm,
      newMemberName,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [members, expenses, activeTab, appliedSettlements, tripName, expenseForm, newMemberName]);

  useEffect(() => {
    const ua = window.navigator.userAgent;
    const isAndroid = /android/i.test(ua);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

    setIsAndroidDevice(isAndroid);
    setIsStandaloneMode(isStandalone);
  }, []);

  const balances = useMemo(() => {
    const base = computeBalances(members, expenses);
    appliedSettlements.forEach((s) => {
      base[s.fromId] = (base[s.fromId] || 0) + s.amount;
      base[s.toId] = (base[s.toId] || 0) - s.amount;
    });
    return base;
  }, [members, expenses, appliedSettlements]);

  const settlements = useMemo(() => computeSettlements(computeBalances(members, expenses)), [members, expenses]);
  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);
  const pendingSettlements = settlements.filter(
    (s) => !appliedSettlements.some((a) => a.fromId === s.fromId && a.toId === s.toId && Math.abs(a.amount - s.amount) < 0.01)
  );
  const doneSettlements = appliedSettlements;

  function getMember(id: string) {
    return members.find((m) => m.id === id);
  }

  function addExpense() {
    if (
      !expenseForm.description.trim() ||
      !expenseForm.amount ||
      !expenseForm.paidById ||
      !expenseForm.splitAmong.length
    )
      return;
    setExpenses((prev) => [
      {
        id: uid(),
        description: expenseForm.description.trim(),
        amount: parseFloat(expenseForm.amount),
        paidById: expenseForm.paidById,
        splitAmong: expenseForm.splitAmong,
        category: expenseForm.category,
        date: expenseForm.date,
      },
      ...prev,
    ]);
    setExpenseForm({
      description: "",
      amount: "",
      paidById: "",
      splitAmong: [],
      category: "Other",
      date: new Date().toISOString().split("T")[0],
    });
    setShowExpenseModal(false);
  }

  function removeExpense(id: string) {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  }

  function addMember() {
    if (!newMemberName.trim()) return;
    const member: Member = {
      id: uid(),
      name: newMemberName.trim(),
      color: MEMBER_COLORS[members.length % MEMBER_COLORS.length],
    };
    setMembers((prev) => [...prev, member]);
    setNewMemberName("");
    setShowMemberModal(false);
  }

  function removeMember(memberId: string) {
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
    setExpenses((prev) =>
      prev
        .map((e) => ({
          ...e,
          splitAmong: e.splitAmong.filter((id) => id !== memberId),
        }))
        .filter((e) => e.paidById !== memberId && e.splitAmong.length > 0)
    );
    setExpenseForm((prev) => ({
      ...prev,
      paidById: prev.paidById === memberId ? "" : prev.paidById,
      splitAmong: prev.splitAmong.filter((id) => id !== memberId),
    }));
  }

  function toggleSplit(memberId: string) {
    setExpenseForm((prev) => ({
      ...prev,
      splitAmong: prev.splitAmong.includes(memberId)
        ? prev.splitAmong.filter((id) => id !== memberId)
        : [...prev.splitAmong, memberId],
    }));
  }

  function markSettlementPaid(s: Settlement) {
    setAppliedSettlements((prev) => {
      const exists = prev.some((p) => p.fromId === s.fromId && p.toId === s.toId && Math.abs(p.amount - s.amount) < 0.01);
      if (exists) return prev;
      return [...prev, s];
    });
  }

  function undoSettlementPaid(s: Settlement) {
    setAppliedSettlements((prev) => prev.filter((p) => !(p.fromId === s.fromId && p.toId === s.toId && Math.abs(p.amount - s.amount) < 0.01)));
  }

  const categoryTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    expenses.forEach((e) => {
      totals[e.category] = (totals[e.category] || 0) + e.amount;
    });
    return Object.entries(totals).sort((a, b) => b[1] - a[1]);
  }, [expenses]);

  return (
    <div
      className="min-h-screen bg-background"
      style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
    >
      {/* Nav */}
      <nav className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b border-border w-full py-4 md:py-6">
        <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-auto min-h-[4rem] md:min-h-[5rem]">
          <div className="flex items-center gap-3 sm:gap-4 md:gap-5 py-2">
            <img
              src="/logo.jpg"
              alt="AmbagApp logo"
              className="w-12 h-12 rounded-full object-cover bg-muted transition-all duration-300 sm:w-14 sm:h-14 md:w-16 md:h-16 shadow-sm"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/dist/logo.jpg';
              }}
            />
            <span className="font-black tracking-tight text-xl text-neutral-900 sm:text-2xl md:text-3xl bg-gradient-to-r from-neutral-900 to-neutral-600 bg-clip-text text-transparent">
              AmbagApp
            </span>
          </div>

          <button
            onClick={() => setShowExpenseModal(true)}
            style={{ backgroundColor: '#171717', color: '#ffffff' }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all hover:bg-neutral-800"
          >
            <Plus className="w-3.5 h-3.5" style={{ color: '#ffffff' }} />
            <span className="hidden sm:inline" style={{ color: '#ffffff' }}>Add Expense</span>
            <span className="sm:hidden" style={{ color: '#ffffff' }}>Add</span>
          </button>
        </div>
      </nav>

      {/* Main Container */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Header Strip */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
            <div className="max-w-2xl w-full space-y-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-2">
                  Group Trip
                </p>
                <input
                  ref={tripNameRef}
                  type="text"
                  value={tripName}
                  onChange={(e) => setTripName(e.target.value)}
                  placeholder="Enter trip or group name"
                  className="w-full px-3.5 py-3 bg-input-background rounded-3xl border border-border text-3xl md:text-4xl font-semibold tracking-tight text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/10 transition-all"
                />
              </div>
            </div>
            <div className="flex gap-4 sm:gap-8">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Total spent</p>
                <p className="text-2xl font-semibold tracking-tight" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  ₱{fmt(totalSpent)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Per person</p>
                <p className="text-2xl font-semibold tracking-tight text-muted-foreground" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  ₱{fmt(totalSpent / Math.max(1, members.length))}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-2 flex-wrap">
            {members.map((m) => {
              const bal = balances[m.id] || 0;
              return (
                <div key={m.id} className="group flex items-center gap-2 pl-1 pr-2 py-1 bg-card border border-border rounded-full text-sm">
                  <Avatar name={m.name} color={m.color} size="sm" />
                  <span className="font-medium">{m.name}</span>
                  <span className="text-xs font-medium" style={{ fontFamily: "'JetBrains Mono', monospace", color: bal >= 0 ? "#059669" : "#dc2626" }}>
                    {bal >= 0 ? "+" : "-"}₱{fmt(Math.abs(bal))}
                  </span>
                  <button onClick={() => removeMember(m.id)} className="ml-2 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/10 transition-opacity">
                    <X className="w-3 h-3 text-red-500" />
                  </button>
                </div>
              );
            })}
            <button
              ref={addMemberBtnRef}
              onClick={() => setShowMemberModal(true)}
              className="flex items-center gap-1.5 pl-2 pr-3 py-1 border border-dashed border-border rounded-full text-sm text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
            >
              <Plus className="w-3 h-3" />
              <span>Add person</span>
            </button>
          </div>
        </div>

        {/* Layout Split */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
          {/* Left Main Column */}
          <div>
            {/* Tabs Row */}
            <div className="flex gap-0.5 mb-6 p-1 bg-secondary rounded-xl w-full sm:w-auto sm:inline-flex">
              <button
                onClick={() => setActiveTab("expenses")}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all relative ${
                  activeTab === "expenses" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="w-3.5 h-3.5 text-xs font-bold flex items-center justify-center select-none leading-none">₱</span>
                Expenses
              </button>

              <button
                onClick={() => setActiveTab("balances")}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all relative ${
                  activeTab === "balances" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                Balances
              </button>

              <button
                onClick={() => setActiveTab("settle")}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all relative ${
                  activeTab === "settle" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Settle Up
                {pendingSettlements.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {pendingSettlements.length}
                  </span>
                )}
              </button>
            </div>

            {/* Expenses Render */}
            {activeTab === "expenses" && (
              <div className="space-y-2">
                {expenses.length === 0 && (
                  <div className="text-center py-16 border border-dashed border-border rounded-xl text-muted-foreground">
                    <p className="font-medium text-sm">No expenses yet</p>
                  </div>
                )}
                {expenses.map((expense) => {
                  const payer = getMember(expense.paidById);
                  const share = expense.amount / expense.splitAmong.length;
                  const isExpanded = expandedExpenseId === expense.id;
                  return (
                    <div key={expense.id} className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                      <button className="w-full text-left px-4 py-4" onClick={() => setExpandedExpenseId(isExpanded ? null : expense.id)}>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-secondary rounded-lg flex items-center justify-center text-base">{CATEGORY_EMOJI[expense.category] || "📌"}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <p className="font-medium text-foreground truncate">{expense.description}</p>
                              <p className="font-semibold text-foreground" style={{ fontFamily: "'JetBrains Mono', monospace" }}>₱{fmt(expense.amount)}</p>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                              <span>{expense.date}</span>
                              <span>·</span>
                              <span>{payer?.name} paid</span>
                            </div>
                          </div>
                        </div>
                      </button>
                      {isExpanded && (
                        <div className="px-4 pb-4 border-t border-border pt-4">
                          <button onClick={() => removeExpense(expense.id)} className="text-xs text-red-500 hover:underline flex items-center gap-1">
                            Remove expense
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Balances Render */}
            {activeTab === "balances" && (
              <div className="space-y-3">
                {members.map((member) => {
                  const bal = balances[member.id] || 0;
                  const isPos = bal >= 0;
                  return (
                    <div key={member.id} className="bg-card border border-border rounded-xl p-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar name={member.name} color={member.color} size="md" />
                          <p className="font-semibold">{member.name}</p>
                        </div>
                        <p className="font-semibold text-lg" style={{ fontFamily: "'JetBrains Mono', monospace", color: isPos ? "#059669" : "#dc2626" }}>
                          {isPos ? "+" : "-"}₱{fmt(Math.abs(bal))}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Settle Up Render */}
            {activeTab === "settle" && (
              <div className="space-y-2">
                {settlements.length === 0 && <div className="text-center py-16 text-muted-foreground">All settled up!</div>}
                {pendingSettlements.map((s) => {
                  const from = getMember(s.fromId);
                  const to = getMember(s.toId);
                  return (
                    <div key={`${s.fromId}-${s.toId}`} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
                      <div className="text-sm">
                        <span className="font-medium">{from?.name}</span> → <span className="font-medium">{to?.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-red-500" style={{ fontFamily: "'JetBrains Mono', monospace" }}>₱{fmt(s.amount)}</span>
                        <button onClick={() => markSettlementPaid(s)} className="px-3 py-1.5 bg-neutral-900 text-white rounded-lg text-xs font-semibold hover:bg-neutral-800">Paid ✓</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sidebar Right Column */}
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-xl p-5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">Overview</p>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span>Expenses</span><span className="font-semibold">{expenses.length}</span></div>
                <div className="flex justify-between"><span>Total</span><span className="font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>₱{fmt(totalSpent)}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center z-50">
          <div className="bg-card w-full md:max-w-md md:rounded-2xl rounded-t-2xl border border-border shadow-xl max-h-[92vh] overflow-y-auto">
            <div className="sticky top-0 bg-card border-b border-border px-5 py-4 flex items-center justify-between">
              <h2 className="font-semibold text-base">New Expense</h2>
              <button onClick={() => setShowExpenseModal(false)} className="p-1 rounded-lg bg-secondary"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-5">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-2">What for?</label>
                <input autoFocus ref={descRef} type="text" placeholder="Dinner, Uber..." value={expenseForm.description} onChange={(e) => setExpenseForm((p) => ({ ...p, description: e.target.value }))} className="w-full px-3.5 py-2.5 bg-input-background rounded-xl border text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-2">Amount</label>
                <input ref={amountRef} type="number" placeholder="0.00" value={expenseForm.amount} onChange={(e) => setExpenseForm((p) => ({ ...p, amount: e.target.value }))} className="w-full px-3.5 py-2.5 bg-input-background rounded-xl border text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-2">Paid by</label>
                <div className="grid grid-cols-2 gap-2">
                  {members.map((m) => (
                    <button key={m.id} onClick={() => setExpenseForm((p) => ({ ...p, paidById: m.id }))} className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm ${expenseForm.paidById === m.id ? "border-black bg-secondary" : ""}`}>
                      {m.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-5 border-t flex gap-3">
              <button onClick={() => setShowExpenseModal(false)} className="flex-1 py-2.5 border rounded-xl text-sm font-medium">Cancel</button>
              <button
                ref={addExpenseBtnRef}
                onClick={addExpense}
                disabled={!expenseForm.description.trim() || !expenseForm.amount}
                style={{ backgroundColor: '#171717', color: '#ffffff' }}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed text-white"
              >
                Add Expense
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showMemberModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-card w-full md:max-w-sm rounded-2xl border p-5 shadow-xl">
            <h2 className="font-semibold text-base mb-4">Add Person</h2>
            <input autoFocus type="text" placeholder="Enter name" value={newMemberName} onChange={(e) => setNewMemberName(e.target.value)} className="w-full px-3.5 py-2 bg-input-background border rounded-xl text-sm mb-4" />
            <div className="flex gap-3">
              <button onClick={() => setShowMemberModal(false)} className="flex-1 py-2 border rounded-xl text-sm">Cancel</button>
              <button
                onClick={addMember}
                disabled={!newMemberName.trim()}
                style={{ backgroundColor: '#171717', color: '#ffffff' }}
                className="flex-1 py-2 rounded-xl text-sm font-semibold hover:bg-neutral-800 text-white disabled:opacity-40"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}