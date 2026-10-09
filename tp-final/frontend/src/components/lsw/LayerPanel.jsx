import React from 'react';
import { useLayoutStore } from '../../store/useLayoutStore';
import { GPDK045_LAYERS } from '../../data/gpdk045_layers';
import { getStippleDataUrl } from '../../utils/stipplePatterns';
import './LayerPanel.css';

export default function LayerPanel() {
  const { activeLayer, setActiveLayer, layersState, toggleLayerVisibility, toggleLayerLock } = useLayoutStore();

  return (
    <div className="layer-panel">
      <div className="panel-header">CAPAS</div>
      <div className="layer-list">
        {GPDK045_LAYERS.map(layer => {
          const state = layersState[layer.id] || { visible: true, locked: false };
          const isActive = activeLayer === layer.id;
          
          return (
            <div 
              key={layer.id} 
              className={`layer-row ${isActive ? 'active' : ''}`}
              onClick={() => setActiveLayer(layer.id)}
            >
              <div 
                className="col-vis" 
                style={{ opacity: state.visible ? 1 : 0.3 }}
                onClick={(e) => { e.stopPropagation(); toggleLayerVisibility(layer.id); }}
              >
                {state.visible ? '👁' : '—'}
              </div>
              <div 
                className="col-lock"
                style={{ opacity: state.locked ? 1 : 0.3 }}
                onClick={(e) => { e.stopPropagation(); toggleLayerLock(layer.id); }}
              >
                {state.locked ? '🔒' : '—'}
              </div>
              <div className="col-color">
                <div 
                  className="color-box" 
                  style={{ 
                    backgroundColor: layer.stipple === 'solid' ? layer.color : 'rgba(0,0,0,0.5)',
                    backgroundImage: getStippleDataUrl(layer.color, layer.stipple),
                    borderColor: layer.color
                  }}
                ></div>
              </div>
              <div className="col-name">{layer.name}</div>
              <div className="col-short">{layer.shortName}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
