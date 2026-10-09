import React, { useState } from 'react';
import { useLayoutStore } from '../../store/useLayoutStore';
import { extractNetlist } from '../../utils/netlistExtractor';
import { runLVS }        from '../../utils/lvsEngine';
import { schematicNetlists } from '../../data/schematicNetlists';
import './LvsModal.css';

export default function LvsModal({ onClose }) {
  const { shapes } = useLayoutStore();
  const [selectedSchId, setSelectedSchId] = useState(null);
  const [report, setReport] = useState(null);
  const [running, setRunning] = useState(false);

  const handleRun = () => {
    if (!selectedSchId) return;
    setRunning(true);
    setReport(null);

    setTimeout(() => {
      try {
        const schematic = schematicNetlists.find(s => s.id === selectedSchId);
        const layoutNetlist = extractNetlist(shapes);
        const result = runLVS(layoutNetlist, schematic);
        setReport({ ...result, schematic, layoutNetlist });
      } catch (e) {
        setReport({ pass: false, errors: ['Error interno: ' + e.message], warnings: [], details: [] });
      }
      setRunning(false);
    }, 300);
  };

  const getLineClass = (line) => {
    if (line.includes('✘') || line.startsWith('ERR')) return 'error';
    if (line.includes('⚠'))  return 'warn';
    if (line.includes('✔'))  return 'pass';
    if (line.startsWith('──')) return 'section';
    return '';
  };

  return (
    <div className="lvs-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="lvs-modal">

        <div className="lvs-modal-header">
          <h2>⚡ Layout vs. Schematic (LVS)</h2>
          <button className="lvs-close" onClick={onClose}>×</button>
        </div>

        <div className="lvs-body">

          {/* Schematic selector */}
          <div>
            <div className="lvs-section-label">Seleccionar referencia esquemática</div>
            <div className="lvs-schematic-list">
              {schematicNetlists.map(sch => (
                <label
                  key={sch.id}
                  className={`lvs-schematic-item ${selectedSchId === sch.id ? 'selected' : ''}`}
                >
                  <input
                    type="radio"
                    name="schematic"
                    value={sch.id}
                    checked={selectedSchId === sch.id}
                    onChange={() => { setSelectedSchId(sch.id); setReport(null); }}
                  />
                  <div className="item-info">
                    <h3>{sch.name}</h3>
                    <p>{sch.description}</p>
                  </div>
                  <div className="item-badge">
                    {sch.devices.length} devs · {sch.pins.length} pines
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Info about layout */}
          <div>
            <div className="lvs-section-label">Canvas actual</div>
            <div style={{ color: '#64748b', fontSize: '0.82rem' }}>
              {shapes.length} shapes en el canvas —&nbsp;
              {shapes.filter(s => s.layerId === 'PinM1' || s.layerId === 'PinM2').length} pines nombrados
            </div>
          </div>

          {/* Run button */}
          <button
            className="lvs-run-btn"
            disabled={!selectedSchId || running}
            onClick={handleRun}
          >
            {running ? 'Extrayendo netlist…' : '▶  Ejecutar LVS'}
          </button>

          {/* Report */}
          {report && (
            <div className="lvs-report">
              <div className={`lvs-report-banner ${report.pass ? 'pass' : 'fail'}`}>
                <span className="lvs-report-icon">{report.pass ? '✅' : '❌'}</span>
                <span>{report.pass ? 'LVS CORRECTO — Layout coincide con el esquemático' : 'LVS INCORRECTO — Se encontraron errores'}</span>
              </div>

              <div className="lvs-report-body">
                {report.errors.length > 0 && (
                  <>
                    <div className="detail-line section">── Errores ──────────────────────────────────────────</div>
                    {report.errors.map((e, i) => (
                      <div key={i} className="detail-line error">  ✘ {e}</div>
                    ))}
                  </>
                )}
                {report.warnings.length > 0 && (
                  <>
                    <div className="detail-line section">── Advertencias ─────────────────────────────────────</div>
                    {report.warnings.map((w, i) => (
                      <div key={i} className="detail-line warn">  ⚠ {w}</div>
                    ))}
                  </>
                )}
                <br/>
                {report.details.map((line, i) => (
                  <div key={i} className={`detail-line ${getLineClass(line)}`}>{line}</div>
                ))}

                <br/>
                <div className="detail-line section">── Resumen de netlist extraída ──────────────────────</div>
                <div className="detail-line">  Nets:       {report.layoutNetlist.nets.length}</div>
                <div className="detail-line">  Dispositivos: {report.layoutNetlist.devices.length} ({
                  Object.entries(
                    report.layoutNetlist.devices.reduce((acc, d) => { acc[d.type] = (acc[d.type]||0)+1; return acc; }, {})
                  ).map(([t, c]) => `${c} ${t}`).join(', ') || 'ninguno'
                })</div>
                <div className="detail-line">  Pines:      {report.layoutNetlist.pins.map(p => p.name).join(', ') || 'ninguno'}</div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
