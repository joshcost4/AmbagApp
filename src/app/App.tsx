
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

  // Refs for keyboard flow in Add Expense modal
  const descRef = useRef<HTMLInputElement | null>(null);
  const amountRef = useRef<HTMLInputElement | null>(null);
  const dateRef = useRef<HTMLInputElement | null>(null);
  const firstPayerRef = useRef<HTMLButtonElement | null>(null);
  const addExpenseBtnRef = useRef<HTMLButtonElement | null>(null);
  const addMemberBtnRef = useRef<HTMLButtonElement | null>(null);
  const tripNameRef = useRef<HTMLInputElement | null>(null);

  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [showIOSInstallInstructions, setShowIOSInstallInstructions] = useState(false);
  const [showAndroidInstallInstructions, setShowAndroidInstallInstructions] = useState(false);
  const [isAndroidDevice, setIsAndroidDevice] = useState(false);
  const [isStandaloneMode, setIsStandaloneMode] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredInstallPrompt(event as BeforeInstallPromptEvent);
      setShowInstallBanner(true);
      setShowAndroidInstallInstructions(false);
      setShowIOSInstallInstructions(false);
    };

    const handleAppInstalled = () => {
      setDeferredInstallPrompt(null);
      setShowInstallBanner(false);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
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
    const isIOS = /iphone|ipad|ipod/i.test(ua);
    const isAndroid = /android/i.test(ua);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || ('standalone' in navigator && (navigator as any).standalone);

    setIsAndroidDevice(isAndroid);
    setIsStandaloneMode(isStandalone);

    if (!isStandalone) {
      if (isIOS) {
        setShowIOSInstallInstructions(true);
      } else if (isAndroid) {
        setShowAndroidInstallInstructions(true);
      }
    }
  }, []);

  // Derived
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
    // Remove the member from the list
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
    // Remove them from all expenses they were split in and drop expenses they paid
    setExpenses((prev) =>
      prev
        .map((e) => ({
          ...e,
          splitAmong: e.splitAmong.filter((id) => id !== memberId),
        }))
        .filter((e) => e.paidById !== memberId && e.splitAmong.length > 0)
    );
    // Clean up any active form selections
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

  // Category totals
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
      {/* ── Top Nav ───────────────────────────────────────── */}
      <nav className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b border-border">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4 md:gap-5">
            <img
              src="/logo.jpg"
              alt="AmbagApp logo"
              className="w-12 h-12 rounded-full object-cover bg-muted transition-all duration-300 sm:w-14 sm:h-14 md:w-16 md:h-16 shadow-sm"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/dist/logo.jpg';
              }}
            />
            {/* Pinalaki natin ang text mula text-sm patungong bold text-xl at text-2xl/3xl sa desktop */}
            <span className="font-black tracking-tight text-xl text-neutral-900 sm:text-2xl md:text-3xl bg-gradient-to-r from-neutral-900 to-neutral-600 bg-clip-text text-transparent">
              AmbagApp
            </span>
          </div>
          <button
            onClick={() => setShowExpenseModal(true)}
            disabled={members.length === 0}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-semibold transition-all ${
              members.length === 0
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Add Expense</span>
            <span className="sm:hidden">Add</span>
          </button>
          {isAndroidDevice && !isStandaloneMode && !showInstallBanner && (
            <button
              onClick={() => setShowAndroidInstallInstructions(true)}
              className="hidden md:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-border text-sm font-semibold text-foreground hover:bg-secondary transition-all"
            >
              Install
            </button>
          )}
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-6 md:py-10">
        {showInstallBanner && deferredInstallPrompt && (
          <div className="mb-6 rounded-2xl border border-border bg-secondary p-4 text-sm text-foreground flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-semibold">Install AmbagApp</p>
              <p className="text-muted-foreground mt-1">Quickly open this app from your home screen or desktop.</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={async () => {
                  deferredInstallPrompt.prompt();
                  const choice = await deferredInstallPrompt.userChoice;
                  if (choice.outcome === "accepted") {
                    setShowInstallBanner(false);
                  }
                }}
                className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Install
              </button>
              <button
                onClick={() => setShowInstallBanner(false)}
                className="rounded-full border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
        {showAndroidInstallInstructions && !showInstallBanner && (
          <div className="mb-6 rounded-2xl border border-border bg-secondary p-4 text-sm text-foreground">
            <p className="font-semibold">Install AmbagApp on Android</p>
            <p className="mt-2 text-muted-foreground">Open the browser menu and choose "Add to Home screen" to install this app.</p>
            <button
              onClick={() => setShowAndroidInstallInstructions(false)}
              className="mt-3 rounded-full border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Got it
            </button>
          </div>
        )}
        {showIOSInstallInstructions && (
          <div className="mb-6 rounded-2xl border border-border bg-secondary p-4 text-sm text-foreground">
            <p className="font-semibold">Install AmbagApp on iOS</p>
            <p className="mt-2 text-muted-foreground">Tap Share, then select "Add to Home Screen" to install.</p>
            <button
              onClick={() => setShowIOSInstallInstructions(false)}
              className="mt-3 rounded-full border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Got it
            </button>
          </div>
        )}
        {/* ── Group Header ──────────────────────────────────── */}
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
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      tripNameRef.current?.blur();
                      addMemberBtnRef.current?.focus();
                    }
                  }}
                  className="w-full px-3.5 py-3 bg-input-background rounded-3xl border border-border text-3xl md:text-4xl font-semibold tracking-tight text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/10 transition-all"
                />
              </div>
            </div>
            <div className="flex gap-4 sm:gap-8">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Total spent</p>
                <p
                  className="text-2xl font-semibold tracking-tight"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  ₱{fmt(totalSpent)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Per person</p>
                <p
                  className="text-2xl font-semibold tracking-tight text-muted-foreground"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  ₱{fmt(totalSpent / Math.max(1, members.length))}
                </p>
              </div>
            </div>
          </div>

          {/* Members strip */}
          <div className="mt-5 flex items-center gap-2 flex-wrap">
            {members.map((m) => {
              const bal = balances[m.id] || 0;
              return (
                <div
                  key={m.id}
                  className="group flex items-center gap-2 pl-1 pr-2 py-1 bg-card border border-border rounded-full text-sm transition-colors"
                >
                  <Avatar name={m.name} color={m.color} size="sm" />
                  <span className="font-medium">{m.name}</span>
                  <span
                    className="text-xs font-medium"
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      color: bal >= 0 ? "#059669" : "#dc2626",
                    }}
                  >
                    {bal >= 0 ? "+" : "-"}₱
                    {fmt(Math.abs(bal))}
                  </span>
                  <button
                    onClick={() => removeMember(m.id)}
                    className="ml-2 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/10 transition-opacity"
                    title="Remove person"
                  >
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
              <div className="w-5 h-5 rounded-full border border-current flex items-center justify-center">
                <Plus className="w-3 h-3" />
              </div>
              Add person
            </button>
          </div>
        </div>

        {/* ── Layout ───────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
          {/* Main Column */}
          <div>
            {/* Tabs */}
            <div className="flex gap-0.5 mb-6 p-1 bg-secondary rounded-xl w-full sm:w-auto sm:inline-flex">
              {(
                [
                  { id: "expenses", label: "Expenses", icon: Receipt },
                  { id: "balances", label: "Balances", icon: BarChart3 },
                  { id: "settle", label: "Settle Up", icon: Sparkles },
                ] as const
              ).map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all relative ${
                    activeTab === id
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                  {id === "settle" && pendingSettlements.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {pendingSettlements.length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* ── Expenses Tab ─────────────────────────── */}
            {activeTab === "expenses" && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-muted-foreground">
                    {expenses.length} expense{expenses.length !== 1 ? "s" : ""}
                  </p>
                </div>

                {expenses.length === 0 && (
                  <div className="text-center py-16 border border-dashed border-border rounded-xl text-muted-foreground">
                    <div className="mx-auto mb-3 text-5xl opacity-40">₱</div>
                    <p className="font-medium text-sm">No expenses yet</p>
                    <p className="text-xs mt-1">Add your first shared expense above</p>
                  </div>
                )}

                <div className="space-y-2">
                  {expenses.map((expense) => {
                    const payer = getMember(expense.paidById);
                    const share = expense.amount / expense.splitAmong.length;
                    const isExpanded = expandedExpenseId === expense.id;
                    return (
                      <div
                        key={expense.id}
                        className="bg-card border border-border rounded-xl overflow-hidden transition-shadow hover:shadow-sm"
                      >
                        <button
                          className="w-full text-left px-4 py-4"
                          onClick={() => setExpandedExpenseId(isExpanded ? null : expense.id)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-secondary rounded-lg flex items-center justify-center text-base flex-shrink-0">
                              {CATEGORY_EMOJI[expense.category] || "📌"}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <p className="font-medium text-foreground truncate">{expense.description}</p>
                                <p
                                  className="font-semibold text-foreground flex-shrink-0"
                                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                                >
                                  ₱{fmt(expense.amount)}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                <span className="text-xs text-muted-foreground">{expense.date}</span>
                                <span className="text-muted-foreground text-xs">·</span>
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <span
                                    className="w-2 h-2 rounded-full flex-shrink-0"
                                    style={{ background: payer?.color }}
                                  />
                                  {payer?.name} paid
                                </span>
                                <span className="text-muted-foreground text-xs">·</span>
                                <span className="text-xs text-muted-foreground">
                                  ₱{fmt(share)}/person
                                </span>
                              </div>
                            </div>
                            <div className="ml-2 flex-shrink-0">
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-muted-foreground" />
                              )}
                            </div>
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="px-4 pb-4 border-t border-border pt-4">
                            <div className="flex items-start gap-6 flex-wrap">
                              <div>
                                <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">
                                  Split between
                                </p>
                                <div className="flex gap-1.5">
                                  {expense.splitAmong.map((id) => {
                                    const m = getMember(id);
                                    return m ? (
                                      <div key={id} className="flex flex-col items-center gap-1">
                                        <Avatar name={m.name} color={m.color} size="sm" />
                                        <span className="text-[10px] text-muted-foreground">{m.name}</span>
                                      </div>
                                    ) : null;
                                  })}
                                </div>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">
                                  Category
                                </p>
                                <Badge>{expense.category}</Badge>
                              </div>
                            </div>
                            <button
                              onClick={() => removeExpense(expense.id)}
                              className="mt-4 text-xs text-muted-foreground hover:text-red-500 transition-colors flex items-center gap-1"
                            >
                              <X className="w-3.5 h-3.5" />
                              Remove expense
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Balances Tab ─────────────────────────── */}
            {activeTab === "balances" && (
              <div className="space-y-3">
                {members.map((member) => {
                  const bal = balances[member.id] || 0;
                  const isPos = bal >= 0;
                  const totalPaid = expenses
                    .filter((e) => e.paidById === member.id)
                    .reduce((s, e) => s + e.amount, 0);
                  const maxBal = Math.max(...Object.values(balances).map(Math.abs), 1);

                  return (
                    <div key={member.id} className="bg-card border border-border rounded-xl p-5">
                      <div className="flex items-center gap-4">
                        <Avatar name={member.name} color={member.color} size="lg" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between gap-3">
                            <p className="font-semibold text-foreground">{member.name}</p>
                            <p
                              className="font-semibold text-lg flex-shrink-0"
                              style={{
                                fontFamily: "'JetBrains Mono', monospace",
                                color: isPos ? "#059669" : "#dc2626",
                              }}
                            >
                              {isPos ? "+" : "-"}₱
                              {fmt(Math.abs(bal))}
                            </p>
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <p className="text-xs text-muted-foreground">
                              Paid ₱{fmt(totalPaid)} · owes{" "}
                              {isPos ? "nothing" : `₱${fmt(Math.abs(bal))}`}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {isPos ? "gets back" : "owes"}
                            </p>
                          </div>
                          <div className="mt-3 h-1.5 bg-secondary rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${(Math.abs(bal) / maxBal) * 100}%`,
                                background: isPos ? "#10b981" : "#ef4444",
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── Settle Up Tab ────────────────────────── */}
            {activeTab === "settle" && (
              <div>
                {settlements.length === 0 && (
                  <div className="text-center py-16 bg-card border border-border rounded-xl">
                    <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Check className="w-6 h-6 text-emerald-600" />
                    </div>
                    <p className="font-semibold text-foreground">All settled up!</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      No outstanding payments between anyone.
                    </p>
                  </div>
                )}

                {pendingSettlements.length > 0 && (
                  <div className="mb-6">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                      Pending · {pendingSettlements.length}
                    </p>
                    <div className="space-y-2">
                      {pendingSettlements.map((s) => {
                        const from = getMember(s.fromId);
                        const to = getMember(s.toId);
                        const key = `${s.fromId}-${s.toId}`;
                        return (
                          <div
                            key={key}
                            className="bg-card border border-border rounded-xl p-4 flex items-center gap-3"
                          >
                            <Avatar name={from?.name || "?"} color={from?.color || "#ccc"} size="md" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-sm">{from?.name}</span>
                                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                                <span className="font-medium text-sm">{to?.name}</span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">needs to send</p>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                              <p
                                className="font-semibold text-red-500"
                                style={{ fontFamily: "'JetBrains Mono', monospace" }}
                              >
                                ₱{fmt(s.amount)}
                              </p>
                              <button
                                onClick={() => markSettlementPaid(s)}
                                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-semibold transition-colors"
                              >
                                Paid ✓
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {doneSettlements.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                      Completed · {doneSettlements.length}
                    </p>
                    <div className="space-y-2">
                      {doneSettlements.map((s) => {
                        const from = getMember(s.fromId);
                        const to = getMember(s.toId);
                        const key = `${s.fromId}-${s.toId}`;
                        return (
                          <div
                            key={key}
                            className="bg-secondary/50 border border-border rounded-xl p-4 flex items-center gap-3 opacity-60"
                          >
                            <Avatar name={from?.name || "?"} color={from?.color || "#ccc"} size="md" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm line-through text-muted-foreground">
                                  {from?.name}
                                </span>
                                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                                <span className="font-medium text-sm line-through text-muted-foreground">
                                  {to?.name}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <p
                                className="font-semibold text-emerald-600 text-sm"
                                style={{ fontFamily: "'JetBrains Mono', monospace" }}
                              >
                                ₱{fmt(s.amount)}
                              </p>
                              <Check className="w-4 h-4 text-emerald-600" />
                              <button
                                onClick={() => undoSettlementPaid(s)}
                                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                              >
                                Undo
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Sidebar ───────────────────────────────── */}
          <div className="space-y-4">
            {/* Summary */}
            <div className="bg-card border border-border rounded-xl p-5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">
                Overview
              </p>
              <div className="space-y-3">
                {[
                  { label: "Expenses", value: `${expenses.length}`, mono: false },
                  { label: "Total", value: `₱${fmt(totalSpent)}`, mono: true },
                  {
                    label: "Per person",
                    value: `₱${fmt(totalSpent / Math.max(1, members.length))}`,
                    mono: true,
                  },
                  { label: "People", value: `${members.length}`, mono: false },
                  {
                    label: "Outstanding",
                    value: `${pendingSettlements.length} payments`,
                    mono: false,
                    color: pendingSettlements.length > 0 ? "#dc2626" : "#059669",
                  },
                ].map(({ label, value, mono, color }) => (
                  <div key={label} className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">{label}</span>
                    <span
                      className="text-sm font-semibold"
                      style={{
                        fontFamily: mono ? "'JetBrains Mono', monospace" : undefined,
                        color: color || undefined,
                      }}
                    >
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Category breakdown */}
            <div className="bg-card border border-border rounded-xl p-5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">
                By Category
              </p>
              <div className="space-y-3">
                {categoryTotals.map(([cat, total]) => {
                  const pct = Math.round((total / totalSpent) * 100);
                  return (
                    <div key={cat}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm flex items-center gap-1.5">
                          <span>{CATEGORY_EMOJI[cat] || "📌"}</span>
                          <span className="text-foreground">{cat}</span>
                        </span>
                        <span
                          className="text-xs text-muted-foreground"
                          style={{ fontFamily: "'JetBrains Mono', monospace" }}
                        >
                          ₱{fmt(total)}
                        </span>
                      </div>
                      <div className="h-1 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-foreground/20 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top spender */}
            <div className="bg-card border border-border rounded-xl p-5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">
                Who Paid Most
              </p>
              {members
                .map((m) => ({
                  member: m,
                  paid: expenses.filter((e) => e.paidById === m.id).reduce((s, e) => s + e.amount, 0),
                }))
                .sort((a, b) => b.paid - a.paid)
                .slice(0, 3)
                .map(({ member, paid }, i) => (
                  <div key={member.id} className={`flex items-center gap-3 ${i > 0 ? "mt-3" : ""}`}>
                    <div className="text-xs text-muted-foreground w-4 text-center font-medium">
                      {i + 1}
                    </div>
                    <Avatar name={member.name} color={member.color} size="sm" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{member.name}</p>
                    </div>
                    <p
                      className="text-sm font-semibold text-muted-foreground"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      ₱{fmt(paid)}
                    </p>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Add Expense Modal ───────────────────────────── */}
      {showExpenseModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center z-50"
          onClick={(e) => e.target === e.currentTarget && setShowExpenseModal(false)}
        >
          <div className="bg-card w-full md:max-w-md md:rounded-2xl rounded-t-2xl border border-border shadow-xl max-h-[92vh] overflow-y-auto">
            <div className="sticky top-0 bg-card border-b border-border px-5 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="font-semibold text-base">New Expense</h2>
              <button
                onClick={() => setShowExpenseModal(false)}
                className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Description */}
                <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-2">
                  What for?
                </label>
                <input
                  autoFocus
                  ref={descRef}
                  type="text"
                  placeholder="Dinner, Uber, Airbnb…"
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm((p) => ({ ...p, description: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      amountRef.current?.focus();
                    }
                  }}
                  className="w-full px-3.5 py-2.5 bg-input-background rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-foreground/10 transition-all"
                />
              </div>

              {/* Amount + Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-2">
                    Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                      ₱
                    </span>
                    <input
                      ref={amountRef}
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={expenseForm.amount}
                      onChange={(e) => setExpenseForm((p) => ({ ...p, amount: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          dateRef.current?.focus();
                        }
                      }}
                      className="w-full pl-7 pr-3.5 py-2.5 bg-input-background rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-foreground/10 transition-all"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-2">
                    Date
                  </label>
                  <input
                    ref={dateRef}
                    type="date"
                    value={expenseForm.date}
                    onChange={(e) => setExpenseForm((p) => ({ ...p, date: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (firstPayerRef.current) firstPayerRef.current.focus();
                        else addExpenseBtnRef.current?.focus();
                      }
                    }}
                    className="w-full px-3.5 py-2.5 bg-input-background rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-foreground/10 transition-all"
                  />
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-2">
                  Category
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c}
                      onClick={() => setExpenseForm((p) => ({ ...p, category: c }))}
                      className={`flex flex-col items-center gap-1 p-2 rounded-xl text-xs border transition-all ${
                        expenseForm.category === c
                          ? "border-foreground bg-secondary"
                          : "border-border text-muted-foreground hover:border-foreground/30"
                      }`}
                    >
                      <span className="text-base">{CATEGORY_EMOJI[c]}</span>
                      <span className="leading-tight text-center" style={{ fontSize: "10px" }}>
                        {CATEGORY_SHORT[c] || c}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Paid by */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-2">
                  Paid by
                </label>
                {members.length === 0 && (
                  <div className="rounded-xl border border-dashed border-border bg-muted/5 p-4 text-sm text-muted-foreground">
                    Add at least one person before logging an expense.
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  {members.map((m, idx) => (
                    <button
                      key={m.id}
                      ref={idx === 0 ? firstPayerRef : undefined}
                      onClick={() => setExpenseForm((p) => ({ ...p, paidById: m.id }))}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm border transition-all ${
                        expenseForm.paidById === m.id
                          ? "border-foreground bg-secondary font-medium"
                          : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                      }`}
                    >
                      <Avatar name={m.name} color={m.color} size="sm" />
                      {m.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Split between */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Split between
                  </label>
                  {expenseForm.amount && expenseForm.splitAmong.length > 0 && (
                    <span
                      className="text-xs text-muted-foreground"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      ₱{fmt(parseFloat(expenseForm.amount || "0") / expenseForm.splitAmong.length)}/ea
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {members.map((m) => {
                    const selected = expenseForm.splitAmong.includes(m.id);
                    return (
                      <button
                        key={m.id}
                        onClick={() => toggleSplit(m.id)}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm border transition-all ${
                          selected
                            ? "border-foreground bg-secondary font-medium"
                            : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border transition-all ${
                            selected ? "border-transparent" : "border-border"
                          }`}
                          style={selected ? { background: m.color } : {}}
                        >
                          {selected && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                        <Avatar name={m.name} color={m.color} size="sm" />
                        {m.name}
                      </button>
                    );
                  })}
                </div>
                {members.length > 0 && (
                  <button
                    onClick={() =>
                      setExpenseForm((p) => ({
                        ...p,
                        splitAmong:
                          p.splitAmong.length === members.length ? [] : members.map((m) => m.id),
                      }))
                    }
                    className="mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {expenseForm.splitAmong.length === members.length ? "Deselect all" : "Select all"}
                  </button>
                )}
              </div>
            </div>

            <div className="sticky bottom-0 bg-card border-t border-border px-5 py-4 flex gap-3">
              <button
                onClick={() => setShowExpenseModal(false)}
                className="flex-1 py-2.5 border border-border rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                ref={addExpenseBtnRef}
                onClick={addExpense}
                disabled={
                  !expenseForm.description.trim() ||
                  !expenseForm.amount ||
                  expenseForm.splitAmong.length === 0
                }
                className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Add Expense
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Member Modal ────────────────────────────── */}
      {showMemberModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center z-50"
          onClick={(e) => e.target === e.currentTarget && setShowMemberModal(false)}
        >
          <div className="bg-card w-full md:max-w-sm md:rounded-2xl rounded-t-2xl border border-border shadow-xl p-5">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-base">Add Person</h2>
              <button
                onClick={() => setShowMemberModal(false)}
                className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-2 mb-5">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                style={{
                  background: newMemberName
                    ? MEMBER_COLORS[members.length % MEMBER_COLORS.length]
                    : "#d1d5db",
                }}
              >
                {newMemberName ? newMemberName[0].toUpperCase() : <Users className="w-4 h-4" />}
              </div>
              <input
                autoFocus
                type="text"
                placeholder="Name"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addMember()}
                className="flex-1 px-3.5 py-2.5 bg-input-background rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-foreground/10 transition-all"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowMemberModal(false)}
                className="flex-1 py-2.5 border border-border rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={addMember}
                disabled={!newMemberName.trim()}
                className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40"
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
