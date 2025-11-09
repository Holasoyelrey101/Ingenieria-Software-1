import React from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import MapView from './MapView';
import ErrorBoundary from './ErrorBoundary';
import InventoryPage from './pages/InventoryPage';
import AlertsPage from './pages/AlertsPage';
import SecurityPage from './pages/SecurityPage';
import IncidentsPage from './pages/IncidentsPage';
import MaintenancePage from './pages/MaintenancePage';
import CamarasPage from './pages/CamarasPage';
import VehicleCamerasManagement from './pages/VehicleCamerasManagement';
import CalendarViewPage from './pages/RRHHModule/CalendarViewPage';
import ConductorsSchedulePage from './pages/RRHHModule/ConductorsSchedulePage';
import TrainingsPage from './pages/RRHHModule/TrainingsPage';
import EmployeesPage from './pages/RRHHModule/EmployeesPage';
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
            <li style={{ paddingLeft: '1.5rem', marginTop: '0.25rem' }}>
              <NavLink to="/seguridad/camaras">🎥 Cámaras en vivo</NavLink>
            </li>
            <li style={{ paddingLeft: '1.5rem', marginTop: '0.25rem' }}>
              <NavLink to="/seguridad/vehiculos-camaras">⚙️ Gestión de Cámaras</NavLink>
            </li>
            <li><NavLink to="/incidentes">Incidentes</NavLink></li>
            <li><NavLink to="/mantencion">Mantención</NavLink></li>
            <li><strong>RR.HH.</strong>
              <ul style={{ paddingLeft: '1rem', marginTop: '0.5rem' }}>
                <li><NavLink to="/empleados">Empleados</NavLink></li>
                <li><NavLink to="/conductores">Turnos Conductores</NavLink></li>
                <li><NavLink to="/calendario">Calendario de Turnos</NavLink></li>
                <li><NavLink to="/capacitaciones">Capacitaciones</NavLink></li>
              </ul>
            </li>
          </ul>
        </nav>
        <p className="small">Demo: ruteo + inventario + alertas + cámaras + RR.HH.</p>
      </aside>
      <main className="main">
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<MapView />} />
            <Route path="/inventario" element={<InventoryPage />} />
            <Route path="/alertas" element={<AlertsPage />} />
            <Route path="/seguridad" element={<SecurityPage />} />
            <Route path="/seguridad/camaras" element={<CamarasPage />} />
            <Route path="/seguridad/vehiculos-camaras" element={<VehicleCamerasManagement />} />
            <Route path="/incidentes" element={<IncidentsPage />} />
            <Route path="/mantencion" element={<MaintenancePage />} />
            <Route path="/calendario" element={<CalendarViewPage />} />
            <Route path="/conductores" element={<ConductorsSchedulePage />} />
            <Route path="/capacitaciones" element={<TrainingsPage />} />
            <Route path="/empleados" element={<EmployeesPage />} />
          </Routes>
        </ErrorBoundary>
      </main>
    </div>
  );
}