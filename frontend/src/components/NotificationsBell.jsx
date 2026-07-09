// Campana de notificaciones: contador sin leer + panel desplegable.
// Hace polling cada 30s (simple y suficiente para in-app).
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api.js';
import { FontAwesomeIcon, faBell } from '../lib/icons.js';
import { formatFechaHora } from '../lib/ui.js';

export default function NotificationsBell() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [sinLeer, setSinLeer] = useState(0);
  const [abierto, setAbierto] = useState(false);
  const ref = useRef(null);

  async function cargar() {
    try {
      const { data } = await api.get('/notificaciones');
      setItems(data.notificaciones);
      setSinLeer(data.sin_leer);
    } catch {
      /* silencioso */
    }
  }

  useEffect(() => {
    cargar();
    const id = setInterval(cargar, 30000);
    return () => clearInterval(id);
  }, []);

  // Cerrar al hacer click afuera.
  useEffect(() => {
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setAbierto(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  async function abrir() {
    const nuevo = !abierto;
    setAbierto(nuevo);
    if (nuevo && sinLeer > 0) {
      await api.put('/notificaciones/leer-todas').catch(() => {});
      setSinLeer(0);
    }
  }

  function irA(n) {
    setAbierto(false);
    if (n.enlace) navigate(n.enlace);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={abrir}
        className="relative rounded-lg p-2 text-brand-forest hover:bg-brand-sage/20"
        aria-label="Notificaciones"
      >
        <FontAwesomeIcon icon={faBell} />
        {sinLeer > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-teal px-1 text-[10px] font-bold text-white">
            {sinLeer > 9 ? '9+' : sinLeer}
          </span>
        )}
      </button>

      {abierto && (
        <div className="absolute right-0 z-50 mt-2 w-80 max-w-[90vw] rounded-xl border border-brand-sage/40 bg-white shadow-xl">
          <div className="border-b border-brand-sage/30 px-4 py-2.5 text-sm font-semibold text-brand-ink">
            Notificaciones
          </div>
          <div className="max-h-80 overflow-auto">
            {items.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-brand-forest/70">Sin notificaciones.</p>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => irA(n)}
                  className={`block w-full border-b border-brand-sage/20 px-4 py-2.5 text-left last:border-0 hover:bg-brand-sage/10 ${
                    n.leida ? '' : 'bg-brand-lime/20'
                  }`}
                >
                  <p className="text-sm text-brand-ink">{n.mensaje}</p>
                  <p className="mt-0.5 text-xs text-brand-forest/70">{formatFechaHora(n.created_at)}</p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
