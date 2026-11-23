import React from 'react';
import { motion } from 'motion/react';
import {
  Box,
  BrainCircuit,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  KanbanSquare,
  Plus,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { ActiveModule } from '../types/orbis';

interface SidebarProps {
  activeModule: ActiveModule;
  onSelectModule: (mod: ActiveModule) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onOpenCreateAgent: () => void;
  pendingProposalsCount: number;
  activeAgentsCount: number;
  totalAgentsCount: number;
}

const NAV_ITEMS: Array<{
  id: ActiveModule;
  label: string;
  sublabel: string;
  icon: React.FC<{ className?: string }>;
}> = [
  {
    id: 'kanban',
    label: 'To-Do & Pipeline de Tareas',
    sublabel: 'Kanban de Agentes',
    icon: KanbanSquare,
  },
  {
    id: 'roadmap',
    label: 'Calendario de Proyectos',
    sublabel: 'Roadmap & Gantt',
    icon: CalendarRange,
  },
  {
    id: 'cerebro',
    label: 'Cerebro FlowClic',
    sublabel: 'Router & Aprobaciones',
    icon: BrainCircuit,
  },
  {
    id: 'colmena3d',
    label: 'Oficina IA 3D',
    sublabel: 'Vista Isométrica Viva',
    icon: Box,
  },
  {
    id: 'admin',
    label: 'Administración',
    sublabel: 'Conexión BD y Agentes',
    icon: ShieldCheck,
  },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeModule,
  onSelectModule,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
  onOpenCreateAgent,
  pendingProposalsCount,
  activeAgentsCount,
  totalAgentsCount,
}) => {
  const handleSelect = (mod: ActiveModule) => {
    onSelectModule(mod);
    onCloseMobile();
  };

  const sidebarBody = (
    <div className="flex h-full flex-col border-r border-slate-800/80 bg-[#0A101C]">
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between border-b border-slate-800/70 px-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 via-sky-500 to-indigo-500 text-slate-950 shadow-lg shadow-cyan-500/20">
            <Sparkles className="h-4 w-4" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="truncate text-sm font-bold tracking-tight text-slate-50">
                FlowClic
              </div>
              <div className="truncate text-[11px] font-medium text-cyan-400/90">
                Oficina IA
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
          className="hidden h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-all hover:bg-slate-800/80 hover:text-slate-100 active:scale-95 lg:flex"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>

        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Cerrar menú"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-100 lg:hidden"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Navigation Modules with Animated Sliding Indicator */}
      <nav
        className="flex-1 space-y-1.5 overflow-y-auto px-3 py-4"
        aria-label="Módulos principales"
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeModule === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelect(item.id)}
              title={collapsed ? item.label : undefined}
              className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                isActive
                  ? 'text-cyan-200'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-100'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="flowclic-active-nav"
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                  className="absolute inset-0 rounded-xl border border-cyan-500/35 bg-gradient-to-r from-cyan-500/18 to-sky-500/8"
                />
              )}

              <Icon
                className={`relative z-10 h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-105 ${
                  isActive
                    ? 'text-cyan-400'
                    : 'text-slate-400 group-hover:text-slate-200'
                }`}
              />
              {!collapsed && (
                <div className="relative z-10 min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium">
                      {item.label}
                    </span>
                    {item.id === 'cerebro' && pendingProposalsCount > 0 && (
                      <span className="font-mono text-xs font-semibold text-amber-400">
                        {pendingProposalsCount}
                      </span>
                    )}
                  </div>
                  <div className="truncate text-[11px] text-slate-500">
                    {item.sublabel}
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Summary & Prominent "+ Crear Nuevo Agente" Button */}
      <div className="border-t border-slate-800/70 p-3.5">
        {!collapsed && (
          <div className="mb-3 rounded-xl border border-slate-800/80 bg-[#070C16] px-3 py-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Agentes activos</span>
              <span className="font-mono font-semibold text-slate-100">
                {activeAgentsCount} / {totalAgentsCount}
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-300"
                style={{
                  width: `${Math.round(
                    (activeAgentsCount / Math.max(totalAgentsCount, 1)) * 100
                  )}%`,
                }}
              />
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            onOpenCreateAgent();
            onCloseMobile();
          }}
          title={collapsed ? 'Crear Nuevo Agente' : undefined}
          className={`flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-400 px-3 py-2.5 text-xs font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 transition-all duration-150 hover:-translate-y-0.5 hover:from-cyan-300 hover:to-sky-300 active:translate-y-0 active:scale-[0.98] ${
            collapsed ? 'px-0' : ''
          }`}
        >
          <Plus className="h-4 w-4 shrink-0" />
          {!collapsed && (
            <span className="whitespace-nowrap">Crear Nuevo Agente</span>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside
        className={`hidden h-full shrink-0 transition-[width] duration-200 lg:block ${
          collapsed ? 'w-[76px]' : 'w-[264px]'
        }`}
      >
        {sidebarBody}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/70"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative z-10 h-full w-[268px]">
            {sidebarBody}
          </aside>
        </div>
      )}
    </>
  );
};
