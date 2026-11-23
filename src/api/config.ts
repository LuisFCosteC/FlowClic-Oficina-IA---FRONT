/**
 * Configuración de la API (T70). `VITE_API_URL` es obligatoria: no hay valor por defecto en código.
 * Si falta, se registra un error explícito en consola y la app muestra un aviso visible.
 */
const raw = import.meta.env.VITE_API_URL as string | undefined;

export const CONFIG_ERROR: string | null =
  typeof raw === 'string' && raw.trim() !== ''
    ? null
    : 'Falta VITE_API_URL. Copia .env.example a .env y define la URL de la API.';

if (CONFIG_ERROR) {
  console.error(`[FlowClic] ${CONFIG_ERROR}`);
}

/** URL base sin barra final. Vacía si falta la configuración (ver `CONFIG_ERROR`). */
export const API_URL: string = raw ? raw.trim().replace(/\/+$/, '') : '';
