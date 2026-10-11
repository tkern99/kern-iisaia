import React, { useState, useEffect } from 'react';
import { useLayoutStore } from '../../store/useLayoutStore';
import './VersionsModal.css';

export default function VersionsModal({ onClose, currentProjectName, onSelectProject }) {
  const { shapes, loadProject } = useLayoutStore();
  const [layouts, setLayouts] = useState([]);
  const [selectedLayoutId, setSelectedLayoutId] = useState(null);
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null); // { type: 'success'|'error', text: '', details: [] }
  const [newLayoutName, setNewLayoutName] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Cargar lista de layouts al abrir
  useEffect(() => {
    fetchLayouts();
  }, []);

  const fetchLayouts = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/layouts');
      if (!res.ok) throw new Error('Error al consultar layouts');
      const data = await res.json();
      setLayouts(data);
      if (data.length > 0) {
        // Seleccionar por defecto el que coincida con currentProjectName o el primero
        const match = data.find(l => l.name === currentProjectName);
        const idToSelect = match ? match.id : data[0].id;
        setSelectedLayoutId(idToSelect);
        fetchVersions(idToSelect);
      }
    } catch (err) {
      console.error(err);
      setStatusMsg({ type: 'error', text: 'No se pudo conectar con el servidor backend en http://localhost:3001.' });
    }
  };

  const fetchVersions = async (layoutId) => {
    if (!layoutId) return;
    setLoading(true);
    setStatusMsg(null);
    try {
      const res = await fetch(`http://localhost:3001/api/layouts/${layoutId}/versions`);
      if (!res.ok) throw new Error('Error al cargar versiones');
      const data = await res.json();
      setVersions(data);
    } catch (err) {
      console.error(err);
      setStatusMsg({ type: 'error', text: 'Error al consultar versiones de este layout.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectLayout = (layout) => {
    setSelectedLayoutId(layout.id);
    if (onSelectProject) onSelectProject(layout.name);
    fetchVersions(layout.id);
  };

  // 1. Checkout (Bloquear layout para edición)
  const handleCheckout = async () => {
    if (!selectedLayoutId) return;
    setStatusMsg(null);
    try {
      const res = await fetch(`http://localhost:3001/api/layouts/${selectedLayoutId}/checkout`, {
        method: 'POST'
      });
      const data = await res.json();
      if (res.status === 409) {
        setStatusMsg({
          type: 'error',
          text: '🔒 Conflicto de checkout: El layout ya se encuentra bloqueado para edición por otro usuario.'
        });
        return;
      }
      if (!res.ok) throw new Error(data.detail || 'Fallo al realizar checkout');
      
      setStatusMsg({
        type: 'success',
        text: '✔ Checkout exitoso: El layout está bloqueado para tu sesión de edición.'
      });
      fetchLayouts();
    } catch (err) {
      setStatusMsg({ type: 'error', text: 'Error: ' + err.message });
    }
  };

  // 2. Check-in (Guardar versión actual del Canvas con validación DRC)
  const handleCheckin = async () => {
    if (!selectedLayoutId) return;
    if (shapes.length === 0) {
      setStatusMsg({
        type: 'error',
        text: 'El canvas está vacío. Dibuja al menos una geometría antes de hacer check-in.'
      });
      return;
    }

    setStatusMsg({ type: 'info', text: 'Validando reglas DRC y registrando nueva versión…' });

    try {
      const res = await fetch(`http://localhost:3001/api/layouts/${selectedLayoutId}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: shapes })
      });
      const data = await res.json();

      if (res.status === 400) {
        const details = data.detail?.details || [data.detail?.error || 'Violación de reglas DRC'];
        setStatusMsg({
          type: 'error',
          text: '✘ Check-in rechazado por violación de DRC:',
          details: Array.isArray(details) ? details : [String(details)]
        });
        return;
      }

      if (res.status === 409) {
        setStatusMsg({
          type: 'error',
          text: '🔒 Conflicto de versión simultánea (409): Intenta guardar nuevamente.'
        });
        return;
      }

      if (!res.ok) throw new Error(data.detail?.error || 'Error al guardar versión');

      setStatusMsg({
        type: 'success',
        text: `✔ Check-in exitoso: Guardada versión #${data.version_number}. El layout ha sido liberado.`
      });

      fetchVersions(selectedLayoutId);
      fetchLayouts();
    } catch (err) {
      setStatusMsg({ type: 'error', text: 'Error: ' + err.message });
    }
  };

  // 3. Restaurar / Cargar versión al Canvas
  const handleLoadVersion = (ver) => {
    try {
      let shapesToLoad = ver.data;
      if (shapesToLoad && typeof shapesToLoad === 'object' && !Array.isArray(shapesToLoad)) {
        shapesToLoad = shapesToLoad.shapes || shapesToLoad.polygons || [];
      }
      if (!Array.isArray(shapesToLoad)) shapesToLoad = [];
      loadProject(shapesToLoad);
      setStatusMsg({
        type: 'success',
        text: `✔ Versión #${ver.version_number} cargada exitosamente en el Canvas (${shapesToLoad.length} formas).`
      });
    } catch (e) {
      setStatusMsg({ type: 'error', text: 'Error al interpretar los datos de la versión: ' + e.message });
    }
  };

  // 4. Crear nuevo Layout
  const handleCreateLayout = async (e) => {
    e.preventDefault();
    if (!newLayoutName.trim()) return;

    try {
      const res = await fetch('http://localhost:3001/api/layouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newLayoutName.trim(), pdk_id: 1 })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Error al crear layout');

      setNewLayoutName('');
      setShowCreateForm(false);
      await fetchLayouts();
      setSelectedLayoutId(data.id);
      fetchVersions(data.id);
      if (onSelectProject) onSelectProject(data.name);
    } catch (err) {
      setStatusMsg({ type: 'error', text: 'Error al crear layout: ' + err.message });
    }
  };

  const selectedLayout = layouts.find(l => l.id === selectedLayoutId);

  return (
    <div className="versions-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="versions-modal">
        {/* Header */}
        <div className="versions-modal-header">
          <div className="versions-title-group">
            <h2>📦 Control de Versiones & Checkout (FastAPI)</h2>
            <span className="versions-subtitle">Simulador de Layout Educativo GPDK045</span>
          </div>
          <button className="versions-close" onClick={onClose} title="Cerrar">×</button>
        </div>

        <div className="versions-body">
          {/* Layout Selector y Crear */}
          <div className="versions-layout-section">
            <div className="section-header-row">
              <span className="versions-label">Layout Activo</span>
              <button
                className="btn-toggle-create"
                onClick={() => setShowCreateForm(!showCreateForm)}
              >
                {showCreateForm ? 'Cancelar' : '+ Nuevo Layout'}
              </button>
            </div>

            {showCreateForm && (
              <form onSubmit={handleCreateLayout} className="create-layout-form">
                <input
                  type="text"
                  placeholder="Nombre del layout (ej. nand2_cmos)..."
                  value={newLayoutName}
                  onChange={e => setNewLayoutName(e.target.value)}
                  autoFocus
                />
                <button type="submit" className="btn-create-submit">Crear</button>
              </form>
            )}

            <div className="layout-chips-list">
              {layouts.map(l => (
                <div
                  key={l.id}
                  className={`layout-chip ${selectedLayoutId === l.id ? 'active' : ''}`}
                  onClick={() => handleSelectLayout(l)}
                >
                  <span className="chip-name">{l.name}</span>
                  <span className={`chip-badge ${l.is_checked_out ? 'checked-out' : 'available'}`}>
                    {l.is_checked_out ? '🔒 Checked out' : '🔓 Disponible'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Acciones de Checkout / Checkin */}
          {selectedLayout && (
            <div className="versions-actions-card">
              <div className="card-top">
                <div className="layout-meta">
                  <h3>{selectedLayout.name}</h3>
                  <span className="pdk-tag">PDK: {selectedLayout.pdk_name || 'GPDK045'}</span>
                  <span className="status-tag">
                    Estado: {selectedLayout.is_checked_out ? 'Bloqueado para edición (Checked out)' : 'Disponible para Check-out'}
                  </span>
                </div>
                <div className="action-buttons-group">
                  <button
                    className="btn-checkout"
                    disabled={selectedLayout.is_checked_out}
                    onClick={handleCheckout}
                    title="Bloquea el layout exclusivamente para tu edición"
                  >
                    🔒 Checkout
                  </button>
                  <button
                    className="btn-checkin"
                    onClick={handleCheckin}
                    title="Valida DRC y guarda el contenido actual del Canvas como nueva versión"
                  >
                    💾 Check-in (Guardar Canvas)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Mensajes de feedback / Errores DRC */}
          {statusMsg && (
            <div className={`versions-status-banner ${statusMsg.type}`}>
              <div className="status-banner-title">{statusMsg.text}</div>
              {statusMsg.details && statusMsg.details.length > 0 && (
                <ul className="status-banner-list">
                  {statusMsg.details.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Historial de Versiones */}
          <div className="versions-history-section">
            <span className="versions-label">Historial de Versiones</span>
            {loading ? (
              <div className="versions-loading">Cargando versiones desde SQLite…</div>
            ) : versions.length === 0 ? (
              <div className="versions-empty">
                No hay versiones registradas aún para este layout. Haz clic en <strong>Check-in</strong> para guardar la versión inicial.
              </div>
            ) : (
              <div className="versions-list">
                {versions.map(ver => {
                  let shapeCount = 0;
                  try {
                    const d = ver.data;
                    if (Array.isArray(d)) shapeCount = d.length;
                    else if (d && typeof d === 'object') {
                      shapeCount = (d.shapes || d.polygons || []).length;
                    }
                  } catch (e) {}

                  return (
                    <div key={ver.id} className="version-item">
                      <div className="version-badge">v{ver.version_number}</div>
                      <div className="version-info">
                        <div className="version-title">Versión #{ver.version_number}</div>
                        <div className="version-details">
                          {shapeCount} {shapeCount === 1 ? 'geometría' : 'geometrías'} (shapes)
                        </div>
                      </div>
                      <button
                        className="btn-restore-version"
                        onClick={() => handleLoadVersion(ver)}
                        title="Cargar esta versión directamente en el Canvas para visualizar o editar"
                      >
                        ⚡ Cargar en Canvas
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
