import React, { useState } from 'react';
import { useLayoutStore } from '../../store/useLayoutStore';
import LvsModal from '../lvs/LvsModal';
import './Header.css';

export default function Header() {
  const { shapes } = useLayoutStore();
  const [projectName, setProjectName] = useState('mi_inversor');
  const [showLvs, setShowLvs] = useState(false);

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
      const proj = await resProj.json();

      if (proj.error && !proj.id) {
        alert('Error: ' + proj.error);
        return;
      }

      const idToUse = proj.id || 1;
      await fetch(`http://localhost:3001/api/projects/${idToUse}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version_num: '1.0',
          label: 'Manual save',
          snapshot: JSON.stringify(shapes)
        })
      });

      alert('Proyecto guardado. Recargá la página (F5) para verlo en la librería.');
    } catch (e) {
      alert('Error guardando en el backend.');
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
          <button className="btn-lvs" onClick={() => setShowLvs(true)}>LVS</button>
          <button className="btn-versions">Versiones</button>
        </div>
      </header>
      {showLvs && <LvsModal onClose={() => setShowLvs(false)} />}
    </>
  );
}
