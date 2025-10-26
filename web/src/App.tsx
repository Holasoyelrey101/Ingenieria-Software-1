import React from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import MapView from './MapView';
import ErrorBoundary from './ErrorBoundary';
import InventoryPage from './pages/InventoryPage';
import AlertsPage from './pages/AlertsPage';
import SecurityPage from './pages/SecurityPage';
import IncidentsPage from './pages/IncidentsPage';
import './app.css';

export default function App() {
  return (
    <div className="layout">
      <aside className="sidebar">
        <h2>LuxChile</h2>
        <nav>
          <ul>
            <li><NavLink to="/" end>Rutas</NavLink></li>
            <li><NavLink to="/inventario">Inventario</NavLink></li>
            <li><NavLink to="/alertas">Alertas</NavLink></li>
            <li><NavLink to="/seguridad">Seguridad</NavLink></li>
            <li><NavLink to="/incidentes">Incidentes</NavLink></li>
          </ul>
        </nav>
        <p className="small">Demo: ruteo + inventario + alertas</p>
      </aside>
      <main className="main">
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<MapView />} />
            <Route path="/inventario" element={<InventoryPage />} />
            <Route path="/alertas" element={<AlertsPage />} />
            <Route path="/seguridad" element={<SecurityPage />} />
            <Route path="/incidentes" element={<IncidentsPage />} />
          </Routes>
        </ErrorBoundary>
      </main>
    </div>
  );
}
