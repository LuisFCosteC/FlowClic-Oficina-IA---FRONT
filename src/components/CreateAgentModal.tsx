import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Sparkles, UserPlus, X } from 'lucide-react';
import { ModelTier, NewAgentInput } from '../types/orbis';
import { MODEL_TIER_META } from '../data/initialData';

interface CreateAgentModalProps {
  open: boolean;
  onClose: () => void;
  /** Crea el agente en la API. Devuelve el mensaje de error, o `null` si salió bien. */
  onCreateAgent: (input: NewAgentInput) => Promise<string | null>;
}

const AVATAR_SWATCHES = [
  '#06B6D4',
  '#10B981',
  '#F59E0B',
  '#EC4899',
  '#8B5CF6',
  '#F97316',
  '#38BDF8',
  '#E11D48',
];

const PROMPT_PRESETS = [
  {
    label: 'Arquitecto Rust / Core',
    title: 'Ingeniero de Sistemas Core',
    prompt:
      'Diseñas motores de baja latencia seguros en memoria, validas concurrencia determinista y documentas métricas de throughput antes de enviar a revisión de Sheldon.',
  },
  {
    label: 'Especialista Móvil iOS/Android',
    title: 'Ingeniero Mobile Senior',
    prompt:
      'Construyes interfaces móviles fluidas a 60 FPS, manejo seguro de biometría y sincronización offline-first.',
  },
  {
    label: 'Auditor FinOps & Cumplimiento',
    title: 'Analista FinOps & Compliance',
    prompt:
      'Auditas eficiencia de tokens por flujo, detectas cuellos de botella de costos y validas normativas de seguridad y cumplimiento.',
  },
];

export const CreateAgentModal: React.FC<CreateAgentModalProps> = ({
  open,
  onClose,
  onCreateAgent,
}) => {
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [modelTier, setModelTier] = useState<ModelTier>('sonnet_pro');
  const [color, setColor] = useState<string>(AVATAR_SWATCHES[0]);
  const [project, setProject] = useState<string>('');
  const [glasses, setGlasses] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    const trimmedName = name.trim();
    const trimmedPrompt = systemPrompt.trim();
    if (!trimmedName) {
      setError('Ingresa un nombre para el nuevo agente.');
      return;
    }
    if (!trimmedPrompt) {
      setError('Describe las funciones del agente.');
      return;
    }

    setSaving(true);
    const apiError = await onCreateAgent({
      name: trimmedName,
      title: title.trim() || 'Especialista Autónomo',
      description: trimmedPrompt,
      modelTier,
      color,
      glasses,
      project: project.trim(),
    });
    setSaving(false);
    if (apiError) {
      setError(apiError);
      return;
    }
    setName('');
    setTitle('');
    setSystemPrompt('');
    setProject('');
    setError('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-agent-title"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-700/80 bg-[#0D1422] shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-400">
              <UserPlus className="h-4 w-4" />
            </div>
            <div>
              <h2
                id="create-agent-title"
                className="text-base font-semibold text-slate-100"
              >
                Desplegar Nuevo Agente en FlowClic
              </h2>
              <p className="text-xs text-slate-400">
                Se sincronizará inmediatamente con Cerebro FlowClic, Kanban y la oficina 3D.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          {error && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2.5 text-xs text-rose-300">
              {error}
            </div>
          )}

          {/* Quick Role Templates */}
          <div>
            <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-slate-400">
              <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
              <span>Plantillas rápidas de rol</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {PROMPT_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setTitle(preset.title);
                    setSystemPrompt(preset.prompt);
                    setError('');
                  }}
                  className="rounded-xl border border-slate-700/80 bg-slate-900/80 px-3 py-1.5 text-xs text-slate-300 transition-all hover:border-cyan-500/60 hover:text-cyan-200 active:scale-95"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="agent-name"
                className="mb-1.5 block text-xs font-medium text-slate-300"
              >
                Nombre del Agente
              </label>
              <input
                id="agent-name"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError('');
                }}
                placeholder="Ej. Priya, Zack, Nova..."
                className="w-full rounded-xl border border-slate-700/80 bg-[#070B12] px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 transition-colors focus:border-cyan-400 focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="agent-title"
                className="mb-1.5 block text-xs font-medium text-slate-300"
              >
                Especialidad / Cargo
              </label>
              <input
                id="agent-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej. Arquitecta de Seguridad Cloud"
                className="w-full rounded-xl border border-slate-700/80 bg-[#070B12] px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 transition-colors focus:border-cyan-400 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="agent-prompt"
              className="mb-1.5 block text-xs font-medium text-slate-300"
            >
              Funciones del agente (una por línea)
            </label>
            <textarea
              id="agent-prompt"
              rows={3}
              value={systemPrompt}
              onChange={(e) => {
                setSystemPrompt(e.target.value);
                setError('');
              }}
              placeholder="Qué hace este agente. El servidor genera el prompt y aplica las restricciones globales."
              className="w-full rounded-xl border border-slate-700/80 bg-[#070B12] px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 transition-colors focus:border-cyan-400 focus:outline-none"
            />
          </div>

          {/* Model Tier Selector */}
          <div>
            <span className="mb-2 block text-xs font-medium text-slate-300">
              Nivel de Modelo (Claude + Equivalente Gemini)
            </span>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              {(Object.keys(MODEL_TIER_META) as ModelTier[]).map((tier) => {
                const meta = MODEL_TIER_META[tier];
                const active = modelTier === tier;
                return (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => setModelTier(tier)}
                    className={`rounded-xl border p-3.5 text-left transition-all active:scale-[0.98] ${
                      active
                        ? 'border-cyan-400 bg-cyan-500/12 text-slate-100'
                        : 'border-slate-800 bg-[#070B12] text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <div className="font-mono text-xs font-semibold">
                      {meta.shortLabel}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-400">
                      {meta.claude} + {meta.gemini}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-500">
                      {meta.costHint}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Avatar Color + Initial Zone + Project */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <span className="mb-2 block text-xs font-medium text-slate-300">
                Color de Avatar 3D
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {AVATAR_SWATCHES.map((swatch) => (
                  <button
                    key={swatch}
                    type="button"
                    onClick={() => setColor(swatch)}
                    aria-label={`Color ${swatch}`}
                    className={`h-7 w-7 rounded-full transition-transform ${
                      color === swatch
                        ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-[#0D1422]'
                        : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: swatch }}
                  />
                ))}
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  aria-label="Selector de color personalizado"
                  className="h-7 w-7 cursor-pointer overflow-hidden rounded-full border border-slate-700 bg-transparent p-0"
                />
              </div>
              <label className="mt-3 flex items-center gap-2 text-xs text-slate-400">
                <input
                  type="checkbox"
                  checked={glasses}
                  onChange={(e) => setGlasses(e.target.checked)}
                  className="accent-cyan-500"
                />
                <span>Añadir lentes al avatar 3D</span>
              </label>
            </div>

            <div>
              <label
                htmlFor="agent-project"
                className="mb-1.5 block text-xs font-medium text-slate-300"
              >
                Proyecto Asignado
              </label>
              <input
                id="agent-project"
                type="text"
                value={project}
                maxLength={120}
                onChange={(e) => setProject(e.target.value)}
                placeholder="Opcional"
                className="w-full rounded-xl border border-slate-700/80 bg-[#070B12] px-3 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
              />
            </div>

            <div>
              <span className="mb-1.5 block text-xs font-medium text-slate-300">
                Zona Inicial en 3D
              </span>
              <div className="rounded-xl border border-slate-800 bg-[#070B12] px-3 py-2.5 text-xs text-slate-400">
                Descansando · Zona C (todo agente nuevo empieza en reposo)
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-800/80 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-700/80 px-4 py-2 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-gradient-to-r from-cyan-400 to-sky-400 px-5 py-2 text-xs font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 transition-all hover:-translate-y-0.5 hover:from-cyan-300 hover:to-sky-300 active:translate-y-0 active:scale-95 disabled:opacity-60"
            >
              {saving ? 'Creando…' : 'Desplegar Agente'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
