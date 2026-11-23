import React from 'react';
import type {
  AvatarLook,
  FaceStyle,
  Gender,
  HairStyle,
  PantsStyle,
  TopStyle,
} from '../types/agentProfile';

interface AvatarEditorProps {
  name: string;
  /** Color identificador (aro de estado, etiqueta y camiseta por defecto). */
  color: string;
  onColor: (c: string) => void;
  hairStyle: HairStyle;
  onHairStyle: (h: HairStyle) => void;
  glasses: boolean;
  onGlasses: (g: boolean) => void;
  look: AvatarLook;
  onLook: (patch: AvatarLook) => void;
}

const IDENT_COLORS = ['#06B6D4', '#38BDF8', '#10B981', '#F59E0B', '#EC4899', '#6366F1', '#8B5CF6', '#F97316'];
const SKIN_TONES = ['#FCD34D', '#F5D061', '#F4C29F', '#E0A97F', '#C68642', '#8D5524', '#5C3A21'];
const HAIR_COLORS = ['#1C1917', '#3B2618', '#5C3C24', '#8B5A2B', '#D9B25F', '#E7E5E4', '#94A3B8', '#DC2626', '#7C3AED', '#0EA5E9'];
const TOP_COLORS = ['#C91A09', '#2D5A27', '#1D4ED8', '#0D325B', '#7A7D80', '#F8FAFC', '#F59E0B', '#EC4899', '#7C3AED', '#111827'];
const PANTS_COLORS = ['#1E293B', '#111827', '#4A453E', '#958A73', '#1D4ED8', '#7F1D1D', '#F8FAFC', '#6B7280'];
const SHOE_COLORS = ['#0F172A', '#1B1B1B', '#7C2D12', '#F8FAFC', '#DC2626', '#1D4ED8'];

const HAIR_OPTIONS: Array<{ id: HairStyle; label: string }> = [
  { id: 'short', label: 'Corto' },
  { id: 'parted', label: 'Raya al lado' },
  { id: 'long', label: 'Largo' },
  { id: 'bob', label: 'Bob' },
  { id: 'ponytail', label: 'Cola de caballo' },
  { id: 'bun', label: 'Moño' },
  { id: 'curly', label: 'Rizado' },
  { id: 'spiky', label: 'Puntas' },
  { id: 'bald', label: 'Sin cabello' },
];
const GENDERS: Array<{ id: Gender; label: string }> = [
  { id: 'male', label: 'Masculino' },
  { id: 'female', label: 'Femenino' },
  { id: 'neutral', label: 'Neutro' },
];
const FACES: Array<{ id: FaceStyle; label: string }> = [
  { id: 'smile', label: 'Sonriente' },
  { id: 'neutral', label: 'Neutral' },
  { id: 'serious', label: 'Serio' },
  { id: 'worried', label: 'Preocupado' },
];
const TOPS: Array<{ id: TopStyle; label: string }> = [
  { id: 'tshirt', label: 'Camiseta' },
  { id: 'jacket', label: 'Chaqueta' },
  { id: 'hoodie', label: 'Sudadera' },
  { id: 'suit', label: 'Traje' },
  { id: 'dress', label: 'Vestido' },
];
const PANTS: Array<{ id: PantsStyle; label: string }> = [
  { id: 'pants', label: 'Pantalón' },
  { id: 'shorts', label: 'Short' },
  { id: 'skirt', label: 'Falda' },
];

const chip = (active: boolean) =>
  `rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors ${
    active
      ? 'border-cyan-400 bg-cyan-500/20 text-cyan-100'
      : 'border-slate-700 text-slate-300 hover:border-slate-500'
  }`;

const ColorRow: React.FC<{
  label: string;
  value: string;
  presets: string[];
  onChange: (c: string) => void;
}> = ({ label, value, presets, onChange }) => (
  <div>
    <label className="block text-xs text-slate-400">{label}</label>
    <div className="mt-2 flex flex-wrap items-center gap-2">
      {presets.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          aria-label={`${label} ${c}`}
          className={`h-6 w-6 rounded-lg border-2 transition-all ${
            value.toLowerCase() === c.toLowerCase()
              ? 'scale-110 border-white shadow-md'
              : 'border-transparent hover:scale-105'
          }`}
          style={{ backgroundColor: c }}
        />
      ))}
      <input
        type="color"
        value={/^#[0-9a-f]{6}$/i.test(value) ? value : '#888888'}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        aria-label={`${label} personalizado`}
        className="h-6 w-8 cursor-pointer rounded border border-slate-700 bg-transparent p-0"
      />
    </div>
  </div>
);

export const AvatarEditor: React.FC<AvatarEditorProps> = ({
  name,
  color,
  onColor,
  hairStyle,
  onHairStyle,
  glasses,
  onGlasses,
  look,
  onLook,
}) => {
  const gender = look.gender ?? 'neutral';
  const skin = look.skinTone ?? '#FCD34D';
  const hairColor = look.hairColor ?? '#3B2618';
  const face = look.face ?? 'smile';
  const topStyle = look.topStyle ?? 'tshirt';
  const topColor = look.topColor ?? color;
  const innerColor = look.innerColor ?? '#E2E8F0';
  const pantsStyle = look.pantsStyle ?? 'pants';
  const pantsColor = look.pantsColor ?? '#1E293B';
  const shoeColor = look.shoeColor ?? '#0F172A';
  const female = gender === 'female';
  const bare = pantsStyle === 'skirt' || topStyle === 'dress';
  const skinArms = topStyle === 'tshirt' || topStyle === 'dress';
  const stroke = 'rgba(0,0,0,0.25)';

  return (
    <div className="rounded-2xl border border-slate-800 bg-[#070C16] p-4 space-y-4">
      <h4 className="text-xs font-semibold text-slate-200">Aspecto en la Oficina 3D</h4>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_auto]">
        <div className="space-y-4">
          {/* Identidad */}
          <div>
            <label className="block text-xs text-slate-400">Género</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {GENDERS.map((g) => (
                <button key={g.id} type="button" onClick={() => onLook({ gender: g.id })} className={chip(gender === g.id)}>
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          <ColorRow label="Color de piel" value={skin} presets={SKIN_TONES} onChange={(c) => onLook({ skinTone: c })} />

          {/* Cabeza */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs text-slate-400">Peinado</label>
              <select
                value={hairStyle}
                onChange={(e) => onHairStyle(e.target.value as HairStyle)}
                className="mt-1.5 w-full rounded-xl border border-slate-800 bg-[#070B14] px-3 py-2 text-xs text-slate-200 focus:border-cyan-400 focus:outline-none"
              >
                {HAIR_OPTIONS.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400">Expresión</label>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {FACES.map((f) => (
                  <button key={f.id} type="button" onClick={() => onLook({ face: f.id })} className={chip(face === f.id)}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <ColorRow label="Color de cabello" value={hairColor} presets={HAIR_COLORS} onChange={(c) => onLook({ hairColor: c })} />

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="glasses-checkbox"
              checked={glasses}
              onChange={(e) => onGlasses(e.target.checked)}
              className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-cyan-400 focus:ring-cyan-400"
            />
            <label htmlFor="glasses-checkbox" className="text-xs font-medium text-slate-300">
              Lentes / Gafas 3D
            </label>
          </div>

          {/* Ropa */}
          <div>
            <label className="block text-xs text-slate-400">Parte superior</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {TOPS.map((t) => (
                <button key={t.id} type="button" onClick={() => onLook({ topStyle: t.id })} className={chip(topStyle === t.id)}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ColorRow label="Color de la prenda" value={topColor} presets={TOP_COLORS} onChange={(c) => onLook({ topStyle, topColor: c })} />
            <ColorRow
              label="Color secundario (camisa, corbata, detalles)"
              value={innerColor}
              presets={TOP_COLORS}
              onChange={(c) => onLook({ topStyle, innerColor: c })}
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400">Parte inferior</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {PANTS.map((p) => (
                <button key={p.id} type="button" onClick={() => onLook({ pantsStyle: p.id })} className={chip(pantsStyle === p.id)}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ColorRow label="Color del pantalón / falda" value={pantsColor} presets={PANTS_COLORS} onChange={(c) => onLook({ pantsColor: c })} />
            <ColorRow label="Color de zapatos" value={shoeColor} presets={SHOE_COLORS} onChange={(c) => onLook({ shoeColor: c })} />
          </div>

          <ColorRow label="Color identificador (etiqueta y aro de estado)" value={color} presets={IDENT_COLORS} onChange={onColor} />
        </div>

        {/* Previsualización en vivo */}
        <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-800/90 bg-[#040810] p-4 lg:sticky lg:top-2 lg:self-start">
          <div className="relative flex h-56 w-44 items-center justify-center rounded-xl border border-slate-800 bg-slate-950/80 p-2 shadow-inner">
            <svg viewBox="0 0 100 130" className="h-full w-full drop-shadow-md">
              {/* Cabello trasero */}
              {hairStyle === 'long' && <path d="M 27 20 L 24 50 L 34 50 L 34 24 L 66 24 L 66 50 L 76 50 L 73 20 Z" fill={hairColor} />}
              {hairStyle === 'bob' && <path d="M 28 22 L 28 40 L 36 40 L 36 26 L 64 26 L 64 40 L 72 40 L 72 22 Z" fill={hairColor} />}
              {hairStyle === 'ponytail' && <path d="M 66 22 Q 84 30 78 54 Q 72 40 66 30 Z" fill={hairColor} />}
              {/* Stud */}
              <rect x="42" y="6" width="16" height="8" rx="2" fill={skin} stroke={stroke} strokeWidth="1" />
              {/* Cabeza */}
              <rect x="33" y="18" width="34" height="26" rx="4" fill={skin} stroke={stroke} strokeWidth="1" />
              {/* Cabello frontal */}
              {hairStyle === 'short' && <path d="M 30 22 Q 50 10 70 22 L 70 26 L 30 26 Z" fill={hairColor} />}
              {hairStyle === 'parted' && <path d="M 29 24 Q 46 9 71 18 L 72 27 L 38 27 Q 32 25 29 24 Z" fill={hairColor} />}
              {(hairStyle === 'long' || hairStyle === 'bob') && <path d="M 29 24 Q 50 8 71 24 L 71 27 L 29 27 Z" fill={hairColor} />}
              {hairStyle === 'ponytail' && <path d="M 30 23 Q 50 10 70 23 L 70 27 L 30 27 Z" fill={hairColor} />}
              {hairStyle === 'bun' && (
                <g fill={hairColor}>
                  <circle cx="50" cy="6" r="7" />
                  <path d="M 30 23 Q 50 12 70 23 L 70 27 L 30 27 Z" />
                </g>
              )}
              {hairStyle === 'curly' && <path d="M 26 24 Q 50 6 74 24 Q 78 30 72 33 Q 50 26 28 33 Z" fill={hairColor} />}
              {hairStyle === 'spiky' && (
                <path d="M 30 26 L 34 12 L 42 22 L 50 8 L 58 22 L 66 12 L 70 26 Z" fill={hairColor} />
              )}
              {/* Rostro */}
              {face === 'worried' ? (
                <path d="M 38 25 L 45 22 M 55 22 L 62 25" stroke="#2C1B12" strokeWidth="1.8" strokeLinecap="round" />
              ) : (
                <path d="M 39 24 L 45 23.5 M 55 23.5 L 61 24" stroke="#2C1B12" strokeWidth="1.8" strokeLinecap="round" />
              )}
              <circle cx="42" cy="29" r="2.2" fill="#0F172A" />
              <circle cx="43" cy="28" r="0.8" fill="#fff" />
              <circle cx="58" cy="29" r="2.2" fill="#0F172A" />
              <circle cx="59" cy="28" r="0.8" fill="#fff" />
              {female && (
                <g stroke="#0F172A" strokeWidth="0.9" strokeLinecap="round">
                  <path d="M 39 27 L 37.5 25.5 M 42 26.5 L 41.5 24.8 M 45 27 L 45.8 25.5" />
                  <path d="M 55 27 L 54.2 25.5 M 58 26.5 L 58.5 24.8 M 61 27 L 62.5 25.5" />
                </g>
              )}
              {glasses && (
                <g stroke="#0F172A" strokeWidth="1.6" fill="none">
                  <rect x="37" y="25" width="10" height="9" rx="2" />
                  <rect x="53" y="25" width="10" height="9" rx="2" />
                  <line x1="47" y1="29" x2="53" y2="29" />
                </g>
              )}
              {face === 'smile' && <path d="M 44 37 Q 50 42 56 37" stroke={female ? '#BE185D' : '#451A03'} strokeWidth="1.8" fill="none" strokeLinecap="round" />}
              {face === 'neutral' && <path d="M 45 38 L 55 38" stroke={female ? '#BE185D' : '#451A03'} strokeWidth="1.8" strokeLinecap="round" />}
              {face === 'serious' && <path d="M 44 38 Q 50 39 56 37.5" stroke={female ? '#BE185D' : '#451A03'} strokeWidth="1.8" fill="none" strokeLinecap="round" />}
              {face === 'worried' && <path d="M 45 40 Q 50 36 55 40" stroke={female ? '#BE185D' : '#451A03'} strokeWidth="1.8" fill="none" strokeLinecap="round" />}
              {/* Cuello */}
              <rect x="44" y="44" width="12" height="4" fill={skin} />
              {/* Brazos */}
              <path d="M 31 48 L 22 72" stroke={topColor} strokeWidth="6" strokeLinecap="round" fill="none" />
              <path d="M 69 48 L 78 72" stroke={topColor} strokeWidth="6" strokeLinecap="round" fill="none" />
              <path d="M 22 72 L 20 82" stroke={skinArms ? skin : topColor} strokeWidth="6" strokeLinecap="round" fill="none" />
              <path d="M 78 72 L 80 82" stroke={skinArms ? skin : topColor} strokeWidth="6" strokeLinecap="round" fill="none" />
              <circle cx="20" cy="86" r="3.5" fill={skin} />
              <circle cx="80" cy="86" r="3.5" fill={skin} />
              {/* Torso */}
              {topStyle === 'dress' ? (
                <polygon points="32,48 68,48 82,106 18,106" fill={topColor} stroke={stroke} strokeWidth="1.2" />
              ) : (
                <polygon points="32,48 68,48 74,86 26,86" fill={topStyle === 'jacket' ? innerColor : topStyle === 'suit' ? '#F8FAFC' : topColor} stroke={stroke} strokeWidth="1.2" />
              )}
              {topStyle === 'jacket' && (
                <g fill={topColor} stroke={stroke} strokeWidth="1">
                  <polygon points="32,48 46,48 44,86 26,86" />
                  <polygon points="68,48 54,48 56,86 74,86" />
                </g>
              )}
              {topStyle === 'suit' && (
                <g>
                  <polygon points="32,48 46,48 50,66 44,86 26,86" fill={topColor} />
                  <polygon points="68,48 54,48 50,66 56,86 74,86" fill={topColor} />
                  <polygon points="48,50 52,50 53,76 50,80 47,76" fill={innerColor} />
                </g>
              )}
              {topStyle === 'hoodie' && (
                <g stroke={stroke} strokeWidth="1">
                  <path d="M 38 48 L 50 58 L 62 48" fill="none" />
                  <path d="M 42 74 L 58 74 L 61 85 L 39 85 Z" fill="rgba(0,0,0,0.18)" />
                  <path d="M 46 52 L 46 62 M 54 52 L 54 62" stroke={innerColor} strokeWidth="1.6" />
                </g>
              )}
              {topStyle === 'tshirt' && <circle cx="50" cy="64" r="6" fill={innerColor} opacity="0.9" />}
              {topStyle === 'dress' && <rect x="28" y="72" width="44" height="5" fill={innerColor} />}
              {/* Parte inferior */}
              {pantsStyle === 'skirt' && topStyle !== 'dress' && (
                <polygon points="30,86 70,86 80,104 20,104" fill={pantsColor} stroke={stroke} strokeWidth="1.2" />
              )}
              {pantsStyle !== 'skirt' && topStyle !== 'dress' && <rect x="30" y="84" width="40" height="8" rx="1.5" fill={pantsColor} />}
              {/* Piernas */}
              <rect x="31" y={bare ? 104 : 92} width="17" height={bare ? 14 : pantsStyle === 'shorts' ? 11 : 26} fill={bare ? skin : pantsColor} stroke={stroke} strokeWidth="1" />
              <rect x="52" y={bare ? 104 : 92} width="17" height={bare ? 14 : pantsStyle === 'shorts' ? 11 : 26} fill={bare ? skin : pantsColor} stroke={stroke} strokeWidth="1" />
              {pantsStyle === 'shorts' && !bare && (
                <g fill={skin} stroke={stroke} strokeWidth="1">
                  <rect x="31" y="103" width="17" height="15" />
                  <rect x="52" y="103" width="17" height="15" />
                </g>
              )}
              {/* Zapatos */}
              <rect x="29" y="118" width="20" height="7" rx="1.5" fill={shoeColor} />
              <rect x="51" y="118" width="20" height="7" rx="1.5" fill={shoeColor} />
            </svg>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2">
              <span className="text-xs font-semibold text-slate-100">{name || 'Agente'}</span>
              <span className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-1.5 py-0.5 font-mono text-[10px] text-cyan-300">
                LEGO PROCEDURAL
              </span>
            </div>
            <p className="mt-1 max-w-[11rem] text-[11px] text-slate-400">
              Así se verá en la Oficina 3D, con articulaciones y animación propias.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
