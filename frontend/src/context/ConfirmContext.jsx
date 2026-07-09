// Dialogo de confirmacion PERSONALIZADO (reemplaza a window.confirm).
// Se usa con una promesa:  const ok = await confirm({ title, message });
import { createContext, useCallback, useContext, useState } from 'react';
import { FontAwesomeIcon, faTriangleExclamation, faXmark } from '../lib/icons.js';

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null); // { opciones, resolver }

  // Devuelve una promesa que resuelve true (confirmar) o false (cancelar).
  const confirm = useCallback((opciones) => {
    return new Promise((resolve) => {
      setState({ opciones, resolve });
    });
  }, []);

  function cerrar(resultado) {
    if (state) state.resolve(resultado);
    setState(null);
  }

  const o = state?.opciones || {};
  const peligro = o.tone === 'danger';

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}

      {state && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
          onClick={() => cerrar(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="mb-4 flex items-start gap-3">
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                  peligro ? 'bg-brand-sage/30 text-brand-forest' : 'bg-brand-sage/30 text-brand-teal'
                }`}
              >
                <FontAwesomeIcon icon={faTriangleExclamation} />
              </span>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-brand-ink">
                  {o.title || '¿Confirmar acción?'}
                </h3>
                {o.message && (
                  <p className="mt-1 text-sm text-brand-forest/70">{o.message}</p>
                )}
              </div>
              <button
                onClick={() => cerrar(false)}
                className="rounded p-1 text-brand-forest/50 hover:bg-brand-sage/20"
                aria-label="Cerrar"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => cerrar(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-brand-forest hover:bg-brand-sage/20"
              >
                {o.cancelText || 'Cancelar'}
              </button>
              <button
                onClick={() => cerrar(true)}
                className={`rounded-lg px-4 py-2 text-sm font-medium text-white ${
                  peligro ? 'bg-brand-forest hover:bg-brand-ink' : 'bg-brand-teal hover:bg-brand-forest'
                }`}
              >
                {o.confirmText || 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm debe usarse dentro de <ConfirmProvider>.');
  return ctx;
}
