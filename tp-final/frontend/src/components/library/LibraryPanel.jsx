import React, { useEffect } from 'react';
import { useLayoutStore } from '../../store/useLayoutStore';
import { useToolStore } from '../../store/useToolStore';
import { standardCells } from '../../data/standardCells';
import './LibraryPanel.css';

export default function LibraryPanel() {
  const { libraryCells, setLibraryCells, setActiveInstance, activeInstance, loadProject, libraryRefreshTrigger } = useLayoutStore();
  const { setActiveTool } = useToolStore();
  
  useEffect(() => {
    fetch('http://localhost:3001/api/projects')
      .then(res => res.json())
      .then(projects => {
        if (!Array.isArray(projects)) throw new Error('Invalid projects');
        const stdNames = new Set(standardCells.map(c => c.name));
        Promise.all(projects.map(p => 
          fetch(`http://localhost:3001/api/projects/${p.id}/versions`)
            .then(res => res.json())
            .then(versions => {
              if (versions && versions.length > 0) {
                 return fetch(`http://localhost:3001/api/projects/${p.id}/versions/${versions[0].id}`)
                   .then(res => res.json())
                   .then(v => {
                     let shapes = [];
                     if (v.data) {
                       shapes = Array.isArray(v.data) ? v.data : (v.data.shapes || v.data.polygons || []);
                     } else if (v.snapshot) {
                       try {
                         shapes = typeof v.snapshot === 'string' ? JSON.parse(v.snapshot) : v.snapshot;
                       } catch (e) {
                         shapes = [];
                       }
                     }
                     return {
                       id: p.id,
                       name: p.name,
                       shapes: Array.isArray(shapes) ? shapes : [],
                       isLibrary: false,
                       isCheckedOut: p.is_checked_out,
                       checkedOutBy: p.checked_out_by,
                       checkedOutByEmail: p.checked_out_by_email
                     };
                   });
              }
              return null;
            })
        )).then(results => {
          // Incluir celdas estándar y proyectos custom del usuario (incluso si tienen el mismo nombre que una celda PDK como inv_cmos)
          const validProjects = results.filter(r => r !== null && (r.shapes?.length > 0 || !stdNames.has(r.name)));
          setLibraryCells([...standardCells, ...validProjects]);
        });
      })
      .catch(err => {
        console.error(err);
        setLibraryCells(standardCells);
      });
  }, [setLibraryCells, libraryRefreshTrigger]);

  const handleSelect = (cell) => {
    setActiveInstance(cell);
    setActiveTool('instance');
  };

  const handleLoadToCanvas = (e, cell) => {
    e.stopPropagation();
    if (cell.shapes && cell.shapes.length > 0) {
      loadProject(
        cell.shapes,
        cell.name,
        cell.id || null,
        cell.isCheckedOut ? {
          isCheckedOut: cell.isCheckedOut,
          checkedOutBy: cell.checkedOutBy,
          checkedOutByEmail: cell.checkedOutByEmail
        } : { isCheckedOut: false, checkedOutBy: null, checkedOutByEmail: null }
      );
      setActiveInstance(null);
      setActiveTool('select');
    }
  };

  const handleDelete = async (e, cell) => {
    e.stopPropagation();

    const isCustom = !cell.isLibrary;
    const confirmMsg = isCustom
      ? `¿Eliminar la instancia "${cell.name}"? Se borrará el proyecto guardado.`
      : `¿Eliminar la instancia "${cell.name}" de la lista?`;

    if (!window.confirm(confirmMsg)) {
      return;
    }

    if (isCustom && cell.id) {
      try {
        const res = await fetch(`http://localhost:3001/api/projects/${cell.id}`, {
          method: 'DELETE'
        });
        if (!res.ok) {
          console.error('Error al eliminar proyecto del servidor');
        }
      } catch (err) {
        console.error('Error de red al eliminar proyecto:', err);
      }
    }

    setLibraryCells(libraryCells.filter(c => c.id !== cell.id));

    if (activeInstance?.id === cell.id) {
      setActiveInstance(null);
      setActiveTool('select');
    }
  };

  return (
    <div className="library-panel">
      <div className="panel-header">Library / Instances</div>
      <div className="library-list">
        {libraryCells.map(cell => (
          <div 
            key={cell.id} 
            className={`library-item ${activeInstance?.id === cell.id ? 'active' : ''}`}
            onClick={() => handleSelect(cell)}
            onDoubleClick={(e) => handleLoadToCanvas(e, cell)}
            title="Clic: Seleccionar para instanciar | Doble clic o ✏️: Cargar y editar en Canvas"
          >
            <div className="library-item-info">
              <span className="library-item-name" title={cell.name}>{cell.name}</span>
              {cell.isLibrary ? (
                <span className="badge">PDK</span>
              ) : (
                <span className="badge custom-badge">CUSTOM</span>
              )}
            </div>
            <div className="library-item-actions">
              <button
                className="load-to-canvas-btn"
                title={`Cargar ${cell.name} en Canvas para editar`}
                onClick={(e) => handleLoadToCanvas(e, cell)}
              >
                ✏️
              </button>
              <button
                className="delete-instance-btn"
                title={`Eliminar instancia ${cell.name}`}
                onClick={(e) => handleDelete(e, cell)}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  <line x1="10" y1="11" x2="10" y2="17" />
                  <line x1="14" y1="11" x2="14" y2="17" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

