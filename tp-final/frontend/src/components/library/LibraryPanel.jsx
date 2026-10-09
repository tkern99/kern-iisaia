import React, { useEffect } from 'react';
import { useLayoutStore } from '../../store/useLayoutStore';
import { useToolStore } from '../../store/useToolStore';
import { standardCells } from '../../data/standardCells';
import './LibraryPanel.css';

export default function LibraryPanel() {
  const { libraryCells, setLibraryCells, setActiveInstance, activeInstance } = useLayoutStore();
  const { setActiveTool } = useToolStore();
  
  useEffect(() => {
    fetch('http://localhost:3001/api/projects')
      .then(res => res.json())
      .then(projects => {
        if (!Array.isArray(projects)) throw new Error('Invalid projects');
        Promise.all(projects.map(p => 
          fetch(`http://localhost:3001/api/projects/${p.id}/versions`)
            .then(res => res.json())
            .then(versions => {
              if (versions.length > 0) {
                 return fetch(`http://localhost:3001/api/projects/${p.id}/versions/${versions[0].id}`)
                   .then(res => res.json())
                   .then(v => ({
                     id: p.id,
                     name: p.name,
                     shapes: JSON.parse(v.snapshot || '[]'),
                     isLibrary: false
                   }));
              }
              return null;
            })
        )).then(results => {
          const validProjects = results.filter(r => r !== null);
          setLibraryCells([...standardCells, ...validProjects]);
        });
      })
      .catch(err => {
        console.error(err);
        setLibraryCells(standardCells);
      });
  }, [setLibraryCells]);

  const handleSelect = (cell) => {
    setActiveInstance(cell);
    setActiveTool('instance');
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
          >
            <span>{cell.name}</span>
            {cell.isLibrary && <span className="badge">PDK</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
