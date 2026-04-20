"use client";

import React, { useState } from "react";
import SearchIcon from '@carbon/icons-react/es/Search'
import SettingsIcon from '@carbon/icons-react/es/Settings'
import UserIcon from '@carbon/icons-react/es/User'
import ChevronDownIcon from '@carbon/icons-react/es/ChevronDown'
import Time from '@carbon/icons-react/es/Time'
import CheckmarkOutline from '@carbon/icons-react/es/CheckmarkOutline'
import ErrorFilled from '@carbon/icons-react/es/ErrorFilled'
import TrashCan from '@carbon/icons-react/es/TrashCan'
import DataBase from '@carbon/icons-react/es/DataBase'
import Query from '@carbon/icons-react/es/Query'
import Table from '@carbon/icons-react/es/Table'
import Box from '@carbon/icons-react/es/Box'
import UserMultiple from '@carbon/icons-react/es/UserMultiple'
import OrderDetails from '@carbon/icons-react/es/OrderDetails'
import Category from '@carbon/icons-react/es/Category'
import Dashboard from '@carbon/icons-react/es/Dashboard'
import WarningAlt from '@carbon/icons-react/es/WarningAlt'
import Analytics from '@carbon/icons-react/es/Analytics'
import type { HistoryItem, AppView, User, UserRole } from "@/types";
import { LogOut } from "lucide-react";

const softSpringEasing = "cubic-bezier(0.25, 1.1, 0.4, 1)";

/* ──────────────────────────── Logo ──────────────────────────────────────── */

function SqlAssistantLogo() {
  return (
    <div className="size-7 flex items-center justify-center text-foreground">
      <DataBase size={20} />
    </div>
  );
}

/* ──────────────────────────── Avatar ────────────────────────────────────── */

function AvatarCircle() {
  return (
    <div className="relative rounded-full shrink-0 size-8 bg-card border border-border flex items-center justify-center">
      <UserIcon size={16} className="text-foreground" />
    </div>
  );
}

/* ──────────────────────────── Search ────────────────────────────────────── */

function SearchContainer({ isCollapsed = false }: { isCollapsed?: boolean }) {
  const [value, setValue] = useState("");

  return (
    <div
      className={`relative shrink-0 transition-all duration-500 ${
        isCollapsed ? "w-full flex justify-center" : "w-full"
      }`}
      style={{ transitionTimingFunction: softSpringEasing }}
    >
      <div
        className={`bg-card h-10 relative rounded-lg flex items-center transition-all duration-500 ${
          isCollapsed ? "w-10 min-w-10 justify-center" : "w-full"
        }`}
        style={{ transitionTimingFunction: softSpringEasing }}
      >
        <div
          className={`flex items-center justify-center shrink-0 ${
            isCollapsed ? "p-1" : "px-1"
          }`}
        >
          <div className="size-8 flex items-center justify-center">
            <SearchIcon size={16} className="text-muted-foreground" />
          </div>
        </div>

        <div
          className={`flex-1 relative transition-opacity duration-500 overflow-hidden ${
            isCollapsed ? "opacity-0 w-0" : "opacity-100"
          }`}
          style={{ transitionTimingFunction: softSpringEasing }}
        >
          <input
            type="text"
            placeholder="Buscar..."
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full bg-transparent border-none outline-none text-sm text-foreground placeholder:text-foreground0 leading-5 pr-2"
            tabIndex={isCollapsed ? -1 : 0}
          />
        </div>

        <div
          aria-hidden="true"
          className="absolute inset-0 rounded-lg border border-border pointer-events-none"
        />
      </div>
    </div>
  );
}

/* ──────────────────────────── Icon Nav ──────────────────────────────────── */

function IconNavButton({
  children,
  isActive = false,
  onClick,
  title,
}: {
  children: React.ReactNode;
  isActive?: boolean;
  onClick?: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      className={`flex items-center justify-center rounded-lg size-10 min-w-10 transition-colors duration-300 ${
        isActive
          ? "bg-primary/15 text-primary"
          : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
      }`}
      style={{ transitionTimingFunction: softSpringEasing }}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

type NavSection = "history" | "tables" | "queries" | "settings";

const ROLE_ALLOWED: Record<UserRole, AppView[]> = {
  admin:      ["dashboard", "query", "products", "customers", "orders", "categories", "lowstock", "reports", "settings", "profile"],
  vendedor:   ["dashboard", "orders", "customers", "reports", "settings", "profile"],
  bodega:     ["products", "categories", "lowstock", "settings", "profile"],
  espectador: ["dashboard", "query", "products", "customers", "orders", "reports", "profile"],
};

const ROLE_BADGE_COLOR: Record<UserRole, string> = {
  admin:      "bg-primary/20 text-primary border-primary/30",
  vendedor:   "bg-blue-500/20 text-blue-300 border-blue-500/30",
  bodega:     "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  espectador: "bg-muted text-muted-foreground border-border",
};

const ROLE_LABEL: Record<UserRole, string> = {
  admin:      "admin",
  vendedor:   "vendedor",
  bodega:     "bodega",
  espectador: "Demo",
};

function IconNavigation({
  activeSection,
  onSectionChange,
  appView,
  onAppViewChange,
  lowStockCount,
  user,
  onLogout,
}: {
  activeSection: NavSection;
  onSectionChange: (s: NavSection) => void;
  appView: AppView;
  onAppViewChange: (v: AppView) => void;
  lowStockCount: number;
  user: User | null;
  onLogout: () => void;
}) {
  const allowed = user ? ROLE_ALLOWED[user.role] : [];
  const handleQueryNav = (s: NavSection) => {
    onSectionChange(s);
    onAppViewChange("query");
  };

  return (
    <aside className="bg-background flex flex-col gap-1 items-center py-4 px-3 w-16 h-full border-r border-border rounded-l-2xl">
      {/* Logo */}
      <div className="mb-3 size-10 flex items-center justify-center">
        <SqlAssistantLogo />
      </div>

      {/* Dashboard */}
      {allowed.includes("dashboard") && (
        <div className="flex flex-col gap-1 w-full items-center mb-1">
          <IconNavButton
            isActive={appView === "dashboard"}
            onClick={() => onAppViewChange("dashboard")}
            title="Dashboard"
          >
            <Dashboard size={16} />
          </IconNavButton>
        </div>
      )}

      {/* Divider + Query mode nav — only admin */}
      {allowed.includes("query") && (
        <>
          <div className="w-6 h-px bg-muted/60 mb-1" />
          <div className="flex flex-col gap-1 w-full items-center">
            <IconNavButton
              isActive={appView === "query" && activeSection === "history"}
              onClick={() => handleQueryNav("history")}
              title="Historial"
            >
              <Time size={16} />
            </IconNavButton>
            <IconNavButton
              isActive={appView === "query" && activeSection === "tables"}
              onClick={() => handleQueryNav("tables")}
              title="Tablas"
            >
              <DataBase size={16} />
            </IconNavButton>
            <IconNavButton
              isActive={appView === "query" && activeSection === "queries"}
              onClick={() => handleQueryNav("queries")}
              title="Queries"
            >
              <Query size={16} />
            </IconNavButton>
          </div>
        </>
      )}

      {/* Divider */}
      <div className="w-6 h-px bg-muted/60 my-2" />

      {/* CRUD mode nav */}
      <div className="flex flex-col gap-1 w-full items-center">
        {allowed.includes("products") && (
          <IconNavButton
            isActive={appView === "products"}
            onClick={() => onAppViewChange("products")}
            title="Productos"
          >
            <Box size={16} />
          </IconNavButton>
        )}
        {allowed.includes("customers") && (
          <IconNavButton
            isActive={appView === "customers"}
            onClick={() => onAppViewChange("customers")}
            title="Clientes"
          >
            <UserMultiple size={16} />
          </IconNavButton>
        )}
        {allowed.includes("orders") && (
          <IconNavButton
            isActive={appView === "orders"}
            onClick={() => onAppViewChange("orders")}
            title="Órdenes"
          >
            <OrderDetails size={16} />
          </IconNavButton>
        )}
        {allowed.includes("categories") && (
          <IconNavButton
            isActive={appView === "categories"}
            onClick={() => onAppViewChange("categories")}
            title="Categorías"
          >
            <Category size={16} />
          </IconNavButton>
        )}
        {allowed.includes("lowstock") && (
          <div className="relative">
            <IconNavButton
              isActive={appView === "lowstock"}
              onClick={() => onAppViewChange("lowstock")}
              title="Stock Bajo"
            >
              <WarningAlt size={16} />
            </IconNavButton>
            {lowStockCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full bg-yellow-500 text-black text-[9px] font-bold flex items-center justify-center px-0.5 pointer-events-none">
                {lowStockCount > 9 ? "9+" : lowStockCount}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Reports */}
      {allowed.includes("reports") && (
        <>
          <div className="w-6 h-px bg-muted/60 my-1" />
          <IconNavButton
            isActive={appView === "reports"}
            onClick={() => onAppViewChange("reports")}
            title="Reportes"
          >
            <Analytics size={16} />
          </IconNavButton>
        </>
      )}

      <div className="flex-1" />

      {/* Bottom: settings + user info + logout */}
      <div className="flex flex-col gap-2 w-full items-center">
        <IconNavButton
          isActive={appView === "settings"}
          onClick={() => onAppViewChange("settings")}
          title="Configuración"
        >
          <SettingsIcon size={16} />
        </IconNavButton>

        {/* User avatar + role badge — clickable → profile */}
        {user && (
          <button
            type="button"
            title={`${user.name} · Ver perfil`}
            onClick={() => onAppViewChange("profile")}
            className="flex flex-col items-center gap-1 group"
          >
            <div className={`relative rounded-full shrink-0 size-8 border flex items-center justify-center transition-colors ${
              appView === "profile"
                ? "bg-primary/15 border-primary/40 text-primary"
                : "bg-card border-border text-foreground group-hover:border-primary/40 group-hover:bg-primary/10 group-hover:text-primary"
            }`}>
              <UserIcon size={14} />
            </div>
            <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded border capitalize ${ROLE_BADGE_COLOR[user.role]}`}>
              {ROLE_LABEL[user.role]}
            </span>
          </button>
        )}

        {/* Logout */}
        <button
          type="button"
          title="Cerrar sesión"
          onClick={onLogout}
          className="flex items-center justify-center rounded-lg size-10 min-w-10 transition-colors duration-300 text-muted-foreground/60 hover:bg-red-950/40 hover:text-red-400"
        >
          <LogOut size={14} />
        </button>
      </div>
    </aside>
  );
}

/* ──────────────────────────── Section Title ─────────────────────────────── */

function SectionTitle({
  title,
  onToggleCollapse,
  isCollapsed,
}: {
  title: string;
  onToggleCollapse: () => void;
  isCollapsed: boolean;
}) {
  if (isCollapsed) {
    return (
      <div className="w-full flex justify-center">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="flex items-center justify-center rounded-lg size-10 hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
          aria-label="Expandir panel"
        >
          <span className="inline-block rotate-180">
            <ChevronDownIcon size={16} />
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between w-full">
      <div className="px-2 py-1">
        <span className="font-semibold text-[17px] text-foreground leading-tight">{title}</span>
      </div>
      <button
        type="button"
        onClick={onToggleCollapse}
        className="flex items-center justify-center rounded-lg size-9 hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
        aria-label="Colapsar panel"
      >
        <ChevronDownIcon size={16} className="-rotate-90" />
      </button>
    </div>
  );
}

/* ──────────────────────────── History Panel ─────────────────────────────── */

function HistoryItemCard({
  item,
  isActive,
  onClick,
}: {
  item: HistoryItem;
  isActive: boolean;
  onClick: () => void;
}) {
  const time = new Date(item.timestamp).toLocaleTimeString("es", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all duration-150 cursor-pointer ${
        isActive
          ? "bg-muted/60 border-border"
          : "bg-muted/30 border-border hover:bg-muted/70 hover:border-border"
      }`}
    >
      <p className="text-xs text-foreground/90 leading-relaxed line-clamp-2">{item.question}</p>
      <div className="flex items-center gap-2 mt-1.5">
        {item.error ? (
          <ErrorFilled size={12} className="text-red-400 shrink-0" />
        ) : (
          <CheckmarkOutline size={12} className="text-emerald-400 shrink-0" />
        )}
        <span className="text-[10px] font-mono text-foreground0">
          {item.error ? "error" : `${item.rowCount} filas`}
        </span>
        <span className="text-[10px] font-mono text-muted-foreground/60 ml-auto">{time}</span>
      </div>
    </button>
  );
}

function HistoryPanel({
  history,
  activeId,
  onSelect,
  onClear,
  isCollapsed,
}: {
  history: HistoryItem[];
  activeId: number | null;
  onSelect: (item: HistoryItem) => void;
  onClear: () => void;
  isCollapsed: boolean;
}) {
  if (isCollapsed) {
    return (
      <div className="flex flex-col items-center gap-1 w-full">
        {history.slice(-5).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item)}
            title={item.question}
            className={`size-10 rounded-lg flex items-center justify-center transition-colors ${
              item.id === activeId
                ? "bg-muted/60"
                : "hover:bg-primary/10 text-muted-foreground hover:text-primary"
            }`}
          >
            {item.error ? (
              <ErrorFilled size={14} className="text-red-400" />
            ) : (
              <CheckmarkOutline size={14} className="text-emerald-400" />
            )}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full flex-1 min-h-0">
      {/* Header row */}
      <div className="flex items-center justify-between px-2 mb-2">
        <span className="text-xs font-mono text-foreground0 uppercase tracking-widest">
          {history.length} consulta{history.length !== 1 ? "s" : ""}
        </span>
        {history.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            title="Limpiar historial"
            className="size-6 flex items-center justify-center rounded hover:bg-muted/60 text-muted-foreground/60 hover:text-red-400 transition-colors"
          >
            <TrashCan size={13} />
          </button>
        )}
      </div>

      {/* Items */}
      <div className="flex flex-col gap-1.5 overflow-y-auto flex-1 pr-0.5">
        {history.length === 0 ? (
          <div className="py-10 text-center flex flex-col items-center gap-3">
            <div className="size-10 rounded-xl bg-card border border-border flex items-center justify-center">
              <Time size={18} className="text-muted-foreground/40" />
            </div>
            <span className="text-xs font-mono text-muted-foreground/60">Sin consultas aún</span>
          </div>
        ) : (
          [...history].reverse().map((item) => (
            <HistoryItemCard
              key={item.id}
              item={item}
              isActive={item.id === activeId}
              onClick={() => onSelect(item)}
            />
          ))
        )}
      </div>
    </div>
  );
}

/* ──────────────────────────── Tables Panel ──────────────────────────────── */

interface TableColumn { name: string; type: string; note?: string }
interface DbTable { name: string; columns: TableColumn[]; suggestedQuery: string }

const DB_TABLES: DbTable[] = [
  {
    name: "categories",
    suggestedQuery: "Mostrar todas las categorías con la cantidad de productos de cada una",
    columns: [
      { name: "id", type: "INTEGER", note: "PK" },
      { name: "name", type: "TEXT" },
      { name: "description", type: "TEXT" },
    ],
  },
  {
    name: "customers",
    suggestedQuery: "Mostrar los 10 clientes con mayor cantidad de órdenes",
    columns: [
      { name: "id", type: "INTEGER", note: "PK" },
      { name: "first_name", type: "TEXT" },
      { name: "last_name", type: "TEXT" },
      { name: "email", type: "TEXT", note: "UNIQUE" },
      { name: "phone", type: "TEXT" },
      { name: "city", type: "TEXT" },
      { name: "country", type: "TEXT" },
      { name: "created_at", type: "TEXT", note: "ISO datetime" },
    ],
  },
  {
    name: "products",
    suggestedQuery: "Listar los 10 productos más caros con su categoría y stock disponible",
    columns: [
      { name: "id", type: "INTEGER", note: "PK" },
      { name: "name", type: "TEXT" },
      { name: "category_id", type: "INTEGER", note: "FK→categories" },
      { name: "price", type: "REAL" },
      { name: "stock", type: "INTEGER" },
      { name: "description", type: "TEXT" },
    ],
  },
  {
    name: "orders",
    suggestedQuery: "Órdenes de los últimos 30 días agrupadas por estado con total de revenue",
    columns: [
      { name: "id", type: "INTEGER", note: "PK" },
      { name: "customer_id", type: "INTEGER", note: "FK→customers" },
      { name: "status", type: "TEXT", note: "pending|processing|shipped|delivered|cancelled" },
      { name: "total", type: "REAL" },
      { name: "created_at", type: "TEXT", note: "ISO datetime" },
    ],
  },
  {
    name: "order_items",
    suggestedQuery: "Productos más vendidos por cantidad total de unidades vendidas",
    columns: [
      { name: "id", type: "INTEGER", note: "PK" },
      { name: "order_id", type: "INTEGER", note: "FK→orders" },
      { name: "product_id", type: "INTEGER", note: "FK→products" },
      { name: "quantity", type: "INTEGER" },
      { name: "unit_price", type: "REAL" },
    ],
  },
];

function TablesPanel({
  isCollapsed,
  onQuerySelect,
}: {
  isCollapsed: boolean;
  onQuerySelect: (q: string) => void;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (name: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });

  if (isCollapsed) {
    return (
      <div className="flex flex-col items-center gap-1 w-full">
        {DB_TABLES.map((t) => (
          <button
            key={t.name}
            type="button"
            title={t.name}
            onClick={() => onQuerySelect(t.suggestedQuery)}
            className="size-10 rounded-lg flex items-center justify-center hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
          >
            <Table size={14} />
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full gap-1 overflow-y-auto flex-1">
      <p className="text-xs font-mono text-foreground0 uppercase tracking-widest px-2 mb-1">
        {DB_TABLES.length} tablas · ecommerce.db
      </p>
      {DB_TABLES.map((table) => {
        const isOpen = expanded.has(table.name);
        return (
          <div key={table.name} className="flex flex-col">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => toggle(table.name)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted/60 transition-colors flex-1 min-w-0"
              >
                <Table size={14} className="text-foreground0 shrink-0" />
                <span className="text-sm text-foreground/90 flex-1 text-left font-mono truncate">{table.name}</span>
                <ChevronDownIcon
                  size={14}
                  className={`text-muted-foreground/60 transition-transform duration-300 shrink-0 ${isOpen ? "rotate-180" : ""}`}
                />
              </button>
              <button
                type="button"
                title={table.suggestedQuery}
                onClick={() => onQuerySelect(table.suggestedQuery)}
                className="size-8 flex items-center justify-center rounded-lg hover:bg-muted/60 text-muted-foreground/60 hover:text-emerald-400 transition-colors shrink-0 mr-1"
              >
                <Query size={13} />
              </button>
            </div>

            {isOpen && (
              <div className="ml-6 mb-2 flex flex-col gap-px border-l border-border pl-3">
                {/* Suggested query chip */}
                <button
                  type="button"
                  onClick={() => onQuerySelect(table.suggestedQuery)}
                  className="flex items-start gap-2 py-1.5 px-1 rounded hover:bg-muted/50 transition-colors text-left group mb-1"
                >
                  <Query size={11} className="text-emerald-600 shrink-0 mt-0.5" />
                  <span className="text-[11px] text-foreground0 group-hover:text-emerald-400 transition-colors leading-snug line-clamp-2">
                    {table.suggestedQuery}
                  </span>
                </button>
                {/* Columns */}
                {table.columns.map((col) => (
                  <div key={col.name} className="flex items-center gap-2 py-0.5 px-1">
                    <span className="text-[12px] font-mono text-foreground/80">{col.name}</span>
                    <span className="text-[11px] font-mono text-muted-foreground/60 ml-auto shrink-0">{col.type}</span>
                    {col.note && (
                      <span className="text-[10px] font-mono text-muted-foreground/40 shrink-0">{col.note}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ──────────────────────────── Queries Panel ─────────────────────────────── */

const EXAMPLE_QUERIES = [
  "¿Cuáles son los 5 productos más vendidos?",
  "Total de ventas por mes en 2024",
  "Clientes con más de 3 órdenes",
  "Productos con stock menor a 10",
  "Órdenes pendientes de hoy",
  "Revenue total por categoría",
];

function QueriesPanel({
  onQuerySelect,
  isCollapsed,
}: {
  onQuerySelect: (q: string) => void;
  isCollapsed: boolean;
}) {
  if (isCollapsed) {
    return (
      <div className="flex flex-col items-center gap-1 w-full">
        {EXAMPLE_QUERIES.slice(0, 4).map((q, i) => (
          <button
            key={i}
            type="button"
            title={q}
            onClick={() => onQuerySelect(q)}
            className="size-10 rounded-lg flex items-center justify-center hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
          >
            <Query size={14} />
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full gap-1 overflow-y-auto flex-1">
      <p className="text-xs font-mono text-foreground0 uppercase tracking-widest px-2 mb-1">
        Ejemplos
      </p>
      {EXAMPLE_QUERIES.map((q, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onQuerySelect(q)}
          className="flex items-start gap-2 px-3 py-2.5 rounded-lg hover:bg-muted/60 transition-colors text-left group"
        >
          <Query size={13} className="text-muted-foreground/60 shrink-0 mt-0.5" />
          <span className="text-[13px] text-muted-foreground group-hover:text-foreground/90 transition-colors leading-snug">
            {q}
          </span>
        </button>
      ))}
    </div>
  );
}

/* ──────────────────────────── Settings Panel ────────────────────────────── */

function SettingsPanel({
  onClear,
  historyCount,
  isCollapsed,
}: {
  onClear: () => void;
  historyCount: number;
  isCollapsed: boolean;
}) {
  if (isCollapsed) {
    return (
      <div className="flex flex-col items-center gap-1 w-full">
        <button
          type="button"
          title="Limpiar historial"
          onClick={onClear}
          className="size-10 rounded-lg flex items-center justify-center hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
        >
          <TrashCan size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full gap-3 overflow-y-auto flex-1">
      {/* Model */}
      <div className="flex flex-col gap-1 px-2">
        <span className="text-xs font-mono text-foreground0 uppercase tracking-widest">Modelo</span>
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-card border border-border">
          <div className="size-2 rounded-full bg-emerald-400 shrink-0" />
          <span className="text-[13px] font-mono text-foreground/80">claude-opus-4-7</span>
        </div>
      </div>

      {/* Database */}
      <div className="flex flex-col gap-1 px-2">
        <span className="text-xs font-mono text-foreground0 uppercase tracking-widest">Base de datos</span>
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-card border border-border">
          <DataBase size={13} className="text-foreground0 shrink-0" />
          <span className="text-[13px] font-mono text-foreground/80">ecommerce.db · SQLite</span>
        </div>
      </div>

      {/* Clear history */}
      <div className="flex flex-col gap-1 px-2">
        <span className="text-xs font-mono text-foreground0 uppercase tracking-widest">Historial</span>
        <button
          type="button"
          onClick={onClear}
          disabled={historyCount === 0}
          className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border hover:bg-red-950/40 hover:border-red-900/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-left"
        >
          <TrashCan size={13} className="text-red-400 shrink-0" />
          <span className="text-[13px] text-foreground/80">
            Limpiar historial
            {historyCount > 0 && (
              <span className="text-muted-foreground/60 ml-1">({historyCount})</span>
            )}
          </span>
        </button>
      </div>
    </div>
  );
}

/* ──────────────────────────── Detail Sidebar ────────────────────────────── */

function DetailSidebar({
  activeSection,
  history,
  activeId,
  onSelect,
  onClear,
  onQuerySelect,
  isCollapsed,
  onToggleCollapse,
}: {
  activeSection: NavSection;
  history: HistoryItem[];
  activeId: number | null;
  onSelect: (item: HistoryItem) => void;
  onClear: () => void;
  onQuerySelect: (q: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const titles: Record<string, string> = {
    history: "Historial",
    tables: "Tablas",
    queries: "Consultas",
    settings: "Config",
  };

  return (
    <aside
      className={`bg-background flex flex-col items-start rounded-r-2xl transition-all duration-500 h-full border-l border-border/50 ${
        isCollapsed ? "w-14 min-w-14 px-2 py-4 gap-2" : "w-72 p-4 gap-3"
      }`}
      style={{ transitionTimingFunction: softSpringEasing }}
    >
      {/* Brand */}
      {!isCollapsed && (
        <div className="flex items-center gap-2 px-1 w-full mb-1">
          <DataBase size={16} className="text-muted-foreground" />
          <span className="text-[15px] font-semibold text-foreground/90">SQL Assistant</span>
        </div>
      )}

      {/* Section title + collapse toggle */}
      <SectionTitle
        title={titles[activeSection] ?? "Panel"}
        onToggleCollapse={onToggleCollapse}
        isCollapsed={isCollapsed}
      />

      {/* Search — only for history/tables */}
      {(activeSection === "history" || activeSection === "tables") && (
        <SearchContainer isCollapsed={isCollapsed} />
      )}

      {/* Panel content */}
      <div
        className={`flex flex-col w-full min-h-0 flex-1 transition-all duration-500 ${
          isCollapsed ? "items-center gap-1" : "gap-2"
        }`}
        style={{ transitionTimingFunction: softSpringEasing }}
      >
        {activeSection === "history" && (
          <HistoryPanel
            history={history}
            activeId={activeId}
            onSelect={onSelect}
            onClear={onClear}
            isCollapsed={isCollapsed}
          />
        )}
        {activeSection === "tables" && (
          <TablesPanel isCollapsed={isCollapsed} onQuerySelect={onQuerySelect} />
        )}
        {activeSection === "queries" && (
          <QueriesPanel
            onQuerySelect={onQuerySelect}
            isCollapsed={isCollapsed}
          />
        )}
        {activeSection === "settings" && (
          <SettingsPanel
            onClear={onClear}
            historyCount={history.length}
            isCollapsed={isCollapsed}
          />
        )}
      </div>

      {/* Footer — model + db status */}
      {!isCollapsed && (
        <div className="w-full mt-auto pt-3 border-t border-border/50 flex flex-col gap-1.5">
          <div className="flex items-center gap-2 px-1">
            <div className="size-2 rounded-full bg-emerald-400 shrink-0" />
            <span className="text-[11px] font-mono text-foreground0">claude-opus-4-7</span>
          </div>
          <div className="flex items-center gap-2 px-1">
            <DataBase size={11} className="text-muted-foreground/60 shrink-0" />
            <span className="text-[11px] font-mono text-muted-foreground/60">ecommerce.db · SQLite</span>
          </div>
        </div>
      )}
    </aside>
  );
}

/* ──────────────────────────── Main Export ───────────────────────────────── */

export interface SqlAssistantSidebarProps {
  history: HistoryItem[];
  activeId: number | null;
  onSelect: (item: HistoryItem) => void;
  onClear: () => void;
  onQuerySelect: (q: string) => void;
  appView: AppView;
  onAppViewChange: (v: AppView) => void;
  isOpen?: boolean;
  onToggle?: () => void;
  lowStockCount?: number;
  user?: User | null;
  onLogout?: () => void;
}

export function SqlAssistantSidebar({
  history,
  activeId,
  onSelect,
  onClear,
  onQuerySelect,
  appView,
  onAppViewChange,
  isOpen = true,
  onToggle,
  lowStockCount = 0,
  user = null,
  onLogout = () => {},
}: SqlAssistantSidebarProps) {
  const [activeSection, setActiveSection] = useState<NavSection>("history");
  const [isCollapsed, setIsCollapsed] = useState(!isOpen);

  const handleToggleCollapse = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    onToggle?.();
  };

  return (
    <div className="flex flex-row h-full">
      <IconNavigation
        activeSection={activeSection}
        onSectionChange={(s) => {
          setActiveSection(s);
          if (isCollapsed) setIsCollapsed(false);
        }}
        appView={appView}
        onAppViewChange={onAppViewChange}
        lowStockCount={lowStockCount}
        user={user}
        onLogout={onLogout}
      />
      <DetailSidebar
        activeSection={activeSection}
        history={history}
        activeId={activeId}
        onSelect={onSelect}
        onClear={onClear}
        onQuerySelect={onQuerySelect}
        isCollapsed={isCollapsed}
        onToggleCollapse={handleToggleCollapse}
      />
    </div>
  );
}

export default SqlAssistantSidebar;
