import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import ProjectsPage from './pages/ProjectsPage.jsx';
import BoardPage from './pages/BoardPage.jsx';
import TasksPage from './pages/TasksPage.jsx';
import TeamsPage from './pages/TeamsPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';

// Guardia: si no hay usuario, redirige a /login.
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/" replace /> : <Register />} />

      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<TasksPage />} />
        <Route path="/proyectos" element={<ProjectsPage />} />
        <Route path="/proyectos/:id" element={<BoardPage />} />
        <Route path="/equipos" element={<TeamsPage />} />
        <Route path="/perfil" element={<ProfilePage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
