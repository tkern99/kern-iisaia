import React from 'react';
import { useToolStore } from '../../store/useToolStore';
import { useLayoutStore } from '../../store/useLayoutStore';
import './Toolbar.css';

export default function Toolbar() {
  const { activeTool, setActiveTool } = useToolStore();
  const { triggerFitView } = useLayoutStore();

  const tools = [
    { id: 'select', label: 'Selección (S)' },
    { id: 'rect', label: 'Rectángulo (R)' },
    { id: 'poly', label: 'Polígono (P)' },
    { id: 'path', label: 'Path/Wire (W)' },
    { id: 'via', label: 'Via/Contact (V)' },
    { id: 'move', label: 'Desplazar (M)' },
    { id: 'ruler', label: 'Regla (D)' },
    { id: 'probe', label: 'Net Tracer (N)' },
    { id: 'instance', label: 'Instancia' },
    { id: 'fit', label: 'Ajustar (F)', isAction: true },
  ];

  const handleToolClick = (tool) => {
    if (tool.isAction && tool.id === 'fit') {
      triggerFitView();
    } else {
      setActiveTool(tool.id);
    }
  };

  return (
    <div className="toolbar">
      {tools.map(tool => (
        <button 
          key={tool.id} 
          className={`tool-btn ${activeTool === tool.id ? 'active' : ''} ${tool.isAction ? 'action-btn' : ''}`}
          onClick={() => handleToolClick(tool)}
          title={tool.id === 'fit' ? 'Ajustar y centrar todas las geometrías en la vista (Tecla F)' : tool.label}
        >
          {tool.label}
        </button>
      ))}
    </div>
  );
}
