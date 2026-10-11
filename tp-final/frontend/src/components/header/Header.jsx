import React, { useState } from 'react';
import { useLayoutStore } from '../../store/useLayoutStore';
import LvsModal from '../lvs/LvsModal';
import DrcModal from '../drc/DrcModal';
import VersionsModal from './VersionsModal';
import './Header.css';

export default function Header() {
  const { shapes, projectName, setProjectName, triggerLibraryRefresh } = useLayoutStore();
  const [showDrc, setShowDrc] = useState(false);
  const [showLvs, setShowLvs] = useState(false);
  const [showVersions, setShowVersions] = useState(false);

  const handleSave = async () => {
    const name = window.prompt("Nombre del proyecto:", projectName);
    if (!name) return;
    setProjectName(name);

    try {
      const resProj = await fetch('http://localhost:3001/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
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

      const idToUse = proj.id || 1;
      const resVer = await fetch(`http://localhost:3001/api/projects/${idToUse}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version_num: '1.0',
          label: 'Manual save',
          snapshot: JSON.stringify(shapes),
          skip_drc: true
        })
      });

      if (!resVer.ok) {
        const errJson = await resVer.json().catch(() => ({}));
        const details = errJson.detail?.details;
        if (details && Array.isArray(details)) {
          alert('Error de validación al guardar:\n' + details.slice(0, 4).join('\n'));
        } else {
          alert('Error al guardar versión: ' + (errJson.detail?.error || resVer.statusText));
        }
        return;
      }

      triggerLibraryRefresh();
      alert(`Proyecto "${name}" guardado correctamente.`);
    } catch (e) {
      alert(`Error guardando en el backend: ${e.message}\nVerifica que el servidor backend (puerto 3001) esté activo.`);
    }
  };

  return (
    <>
      <header className="editor-header">
        <div className="logo">EduLayout</div>
        <div className="project-info">
          <span className="project-name">Proyecto: {projectName}</span>
          <span className="project-version">v1.0</span>
        </div>
        <div className="actions">
          <button className="btn-save" onClick={handleSave}>Guardar</button>
          <button className="btn-drc" onClick={() => setShowDrc(true)}>DRC</button>
          <button className="btn-lvs" onClick={() => setShowLvs(true)}>LVS</button>
          <button className="btn-versions" onClick={() => setShowVersions(true)}>Versiones</button>
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

