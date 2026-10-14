import React, { useState } from 'react';
import { useLayoutStore } from '../../store/useLayoutStore';
import { useAuthStore } from '../../store/useAuthStore';
import LvsModal from '../lvs/LvsModal';
import DrcModal from '../drc/DrcModal';
import VersionsModal from './VersionsModal';
import './Header.css';

export default function Header() {
  const {
    shapes,
    projectName,
    setProjectName,
    triggerLibraryRefresh,
    currentLayoutLock,
    currentLayoutId,
    setCurrentLayoutLock,
    setCurrentLayoutId
  } = useLayoutStore();

  const { user, logout } = useAuthStore();

  const [showDrc, setShowDrc] = useState(false);
  const [showLvs, setShowLvs] = useState(false);
  const [showVersions, setShowVersions] = useState(false);

  const isLockedByOther = currentLayoutLock?.isCheckedOut && currentLayoutLock?.checkedOutBy !== user?.id;
  const isLockedByMe = currentLayoutLock?.isCheckedOut && currentLayoutLock?.checkedOutBy === user?.id;

  const handleSave = async () => {
    // Si el proyecto actual está bloqueado por otro usuario, avisar
    if (isLockedByOther) {
      alert(`⚠️ No puedes modificar "${projectName}": está bloqueado (checked out) por ${currentLayoutLock?.checkedOutByEmail || 'otro usuario'}.\nDebe hacer check-in para liberarlo.`);
      return;
    }

    const name = window.prompt("Nombre del proyecto:", projectName);
    if (!name) return;
    setProjectName(name);

    const comment = window.prompt("Comentario de la versión (opcional):", "Guardado manual");
    if (comment === null) return; // Si cancela, no guarda

    try {
      const resProj = await fetch('http://localhost:3001/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, user_id: user?.id || 1 })
      });

      if (!resProj.ok) {
        const errText = await resProj.text();
        alert('Error al acceder al proyecto en el backend: ' + errText);
        return;
      }
      const proj = await resProj.json();

      if (proj.error && !proj.id) {
        alert('Error: ' + proj.error);
        return;
      }

      const idToUse = proj.id || currentLayoutId || 1;
      setCurrentLayoutId(idToUse);

      const resVer = await fetch(`http://localhost:3001/api/projects/${idToUse}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version_num: '1.0',
          label: comment || 'Manual save',
          comment: comment || '',
          snapshot: JSON.stringify(shapes),
          skip_drc: true,
          user_id: user?.id || 1
        })
      });

      if (!resVer.ok) {
        const errJson = await resVer.json().catch(() => ({}));
        const details = errJson.detail?.details;
        if (resVer.status === 403 || resVer.status === 409) {
          alert(`🔒 Guardado rechazado:\n${errJson.detail || 'El archivo está bloqueado por otro usuario.'}`);
          return;
        }
        if (details && Array.isArray(details)) {
          alert('Error de validación al guardar:\n' + details.slice(0, 4).join('\n'));
        } else {
          alert('Error al guardar versión: ' + (errJson.detail?.error || errJson.detail || resVer.statusText));
        }
        return;
      }

      // El guardado exitoso libera el checkout (check-in)
      setCurrentLayoutLock({ isCheckedOut: false, checkedOutBy: null, checkedOutByEmail: null });
      triggerLibraryRefresh();
      alert(`✔ Proyecto "${name}" guardado correctamente como nueva versión (Check-in realizado).`);
    } catch (e) {
      alert(`Error guardando en el backend: ${e.message}\nVerifica que el servidor backend (puerto 3001) esté activo.`);
    }
  };

  return (
    <>
      <header className="editor-header">
        <div className="header-left">
          <div className="logo">EduLayout</div>
          <div className="project-info">
            <span className="project-name">Proyecto: {projectName}</span>
            <span className="project-version">v1.0</span>

            {/* Indicador de Checkout */}
            {isLockedByOther ? (
              <span className="lock-badge other-lock" title={`Bloqueado por ${currentLayoutLock?.checkedOutByEmail}`}>
                🔒 Bloqueado por {currentLayoutLock?.checkedOutByEmail}
              </span>
            ) : isLockedByMe ? (
              <span className="lock-badge my-lock" title="Bloqueado por ti para edición exclusiva">
                🔓 En edición por ti
              </span>
            ) : (
              <span className="lock-badge available-lock" title="Disponible para checkout">
                🔓 Disponible
              </span>
            )}
          </div>
        </div>

        <div className="header-right">
          <div className="actions">
            <button
              className={`btn-save ${isLockedByOther ? 'btn-disabled' : ''}`}
              onClick={handleSave}
              title={isLockedByOther ? `Bloqueado por ${currentLayoutLock?.checkedOutByEmail}` : 'Guardar nueva versión'}
            >
              Guardar
            </button>
            <button className="btn-drc" onClick={() => setShowDrc(true)}>DRC</button>
            <button className="btn-lvs" onClick={() => setShowLvs(true)}>LVS</button>
            <button className="btn-versions" onClick={() => setShowVersions(true)}>Versiones</button>
          </div>

          {user && (
            <div className="user-profile-badge">
              <span className="user-icon">👤</span>
              <span className="user-email-text" title={user.email}>{user.email}</span>
              <button className="btn-logout" onClick={logout} title="Cambiar de cuenta">
                Salir
              </button>
            </div>
          )}
        </div>
      </header>

      {showDrc && <DrcModal onClose={() => setShowDrc(false)} />}
      {showLvs && <LvsModal onClose={() => setShowLvs(false)} />}
      {showVersions && (
        <VersionsModal
          onClose={() => setShowVersions(false)}
          currentProjectName={projectName}
          onSelectProject={setProjectName}
        />
      )}
    </>
  );
}
