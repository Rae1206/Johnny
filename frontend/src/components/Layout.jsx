// Layout general: sidebar (colapsable en móvil) + header con notificaciones,
// tema claro/oscuro, perfil y cierre de sesión.
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import NotificationsBell from './NotificationsBell.jsx';
import {
  FontAwesomeIcon,
  faListCheck,
  faFolderOpen,
  faUsers,
  faUser,
  faBars,
  faRightFromBracket,
  faMoon,
  faSun,
} from '../lib/icons.js';
import { iniciales } from '../lib/ui.js';

const linkBase =
  'flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors';

function SidebarLinks({ onNavigate }) {
  const active = 'bg-brand-teal text-white';
  const idle = 'text-brand-lime/80 hover:bg-brand-forest hover:text-white';
  const cls = ({ isActive }) => `${linkBase} ${isActive ? active : idle}`;
  return (
    <nav className="flex flex-col gap-1">
      <NavLink to="/" end onClick={onNavigate} className={cls}>
        <FontAwesomeIcon icon={faListCheck} className="w-4" /> Tareas
      </NavLink>
      <NavLink to="/proyectos" onClick={onNavigate} className={cls}>
        <FontAwesomeIcon icon={faFolderOpen} className="w-4" /> Proyectos
      </NavLink>
      <NavLink to="/equipos" onClick={onNavigate} className={cls}>
        <FontAwesomeIcon icon={faUsers} className="w-4" /> Equipos
      </NavLink>
    </nav>
  );
}

// Toggle de tema claro/oscuro, persistido en localStorage.
function ThemeToggle() {
  const [dark, setDark] = useState(() => localStorage.getItem('taskless_theme') === 'dark');
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('taskless_theme', dark ? 'dark' : 'light');
  }, [dark]);
  return (
    <button
      onClick={() => setDark((d) => !d)}
      className="rounded-lg p-2 text-brand-forest hover:bg-brand-sage/20"
      aria-label={dark ? 'Cambiar a claro' : 'Cambiar a oscuro'}
    >
      <FontAwesomeIcon icon={dark ? faSun : faMoon} />
    </button>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="flex h-full min-h-screen">
      <aside className="hidden md:flex w-64 shrink-0 flex-col bg-brand-ink p-4">
        <div className="mb-8 px-2 text-2xl font-bold text-white">Taskless</div>
        <SidebarLinks />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-brand-ink p-4">
            <div className="mb-8 px-2 text-2xl font-bold text-white">Taskless</div>
            <SidebarLinks onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b bg-white px-4 py-3 md:px-6">
          <button
            className="rounded-lg p-2 text-brand-forest hover:bg-brand-sage/20 md:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menu"
          >
            <FontAwesomeIcon icon={faBars} />
          </button>
          <div className="flex flex-1 items-center justify-end gap-1.5 sm:gap-3">
            <NotificationsBell />
            <ThemeToggle />
            <button
              onClick={() => navigate('/perfil')}
              className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 hover:bg-brand-sage/20"
              title="Mi perfil"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-teal text-xs font-bold text-white">
                {iniciales(user?.nombre)}
              </span>
              <span className="hidden text-sm text-brand-forest sm:inline">{user?.nombre}</span>
            </button>
            <button
              onClick={handleLogout}
              className="rounded-lg p-2 text-brand-forest hover:bg-brand-sage/20"
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
            >
              <FontAwesomeIcon icon={faRightFromBracket} />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
