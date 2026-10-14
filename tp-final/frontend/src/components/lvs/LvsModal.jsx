import React, { useState, useRef } from 'react';
import { useLayoutStore } from '../../store/useLayoutStore';
import { extractNetlist } from '../../utils/netlistExtractor';
import { runLVS }        from '../../utils/lvsEngine';
import { schematicNetlists } from '../../data/schematicNetlists';
import './LvsModal.css';

export default function LvsModal({ onClose }) {
  const { shapes } = useLayoutStore();
  const [selectedSchId, setSelectedSchId] = useState(schematicNetlists[0]?.id || null);
  const [report, setReport] = useState(null);
  const [running, setRunning] = useState(false);
  const reportRef = useRef(null);

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
        setTimeout(() => {
          if (reportRef.current) {
            reportRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }, 50);
      } catch (e) {
        setReport({ pass: false, errors: ['Error interno: ' + e.message], warnings: [], details: [] });
      }
      setRunning(false);
    }, 250);
  };

  const getLineClass = (line) => {
    if (line.includes('✘') || line.startsWith('ERR')) return 'error';
    if (line.includes('⚠'))  return 'warn';
    if (line.includes('✔'))  return 'pass';
    if (line.startsWith('──')) return 'section';
    return '';
  };

  const namedPinsCount = shapes.filter(s => s.layerId === 'PinM1' || s.layerId === 'PinM2').length;

  return (
    <div className="lvs-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="lvs-modal">

        <div className="lvs-modal-header">
          <div className="lvs-header-title">
            <h2>⚡ Layout vs. Schematic (LVS)</h2>
            <span className="lvs-header-subtitle">Verificación topológica GPDK045</span>
          </div>
          <button className="lvs-close" onClick={onClose} title="Cerrar">×</button>
        </div>

        <div className="lvs-body">

          {/* Schematic selector */}
          <div className="lvs-schematic-section">
            <div className="lvs-section-label">
              Seleccionar referencia esquemática ({schematicNetlists.length} celdas disponibles)
            </div>
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

          {/* Unified action bar: Layout summary + Run button */}
          <div className="lvs-action-bar">
            <div className="lvs-canvas-stats">
              <span className="stats-icon">📐</span>
              <span className="stats-text">
                Canvas actual: <strong>{shapes.length} formas</strong> · <strong>{namedPinsCount} pines nombrados</strong>
              </span>
            </div>

            <button
              className="lvs-run-btn"
              disabled={!selectedSchId || running}
              onClick={handleRun}
            >
              {running ? 'Extrayendo netlist…' : '▶  Ejecutar LVS'}
            </button>
          </div>

          {/* Report */}
          {report && (
            <div className="lvs-report" ref={reportRef}>
              <div className={`lvs-report-banner ${report.pass ? 'pass' : 'fail'}`}>
                <span className="lvs-report-icon">{report.pass ? '✅' : '❌'}</span>
                <div>
                  <div className="banner-title">
                    {report.pass ? 'LVS CORRECTO — El layout coincide con el esquemático' : 'LVS INCORRECTO — Se encontraron diferencias'}
                  </div>
                  <div className="banner-subtitle">
                    {report.schematic?.name} ({report.schematic?.devices.length} dispositivos, {report.schematic?.pins.length} pines)
                  </div>
                </div>
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
                <div className="detail-line section">── Resumen de netlist extraída del Canvas ───────────</div>
                <div className="detail-line">  Nets detectadas:       {report.layoutNetlist.nets.length}</div>
                <div className="detail-line">  Dispositivos hallados: {report.layoutNetlist.devices.length} ({
                  Object.entries(
                    report.layoutNetlist.devices.reduce((acc, d) => { acc[d.type] = (acc[d.type]||0)+1; return acc; }, {})
                  ).map(([t, c]) => `${c} ${t}`).join(', ') || 'ninguno'
                })</div>
                <div className="detail-line">  Pines reconocidos:     {report.layoutNetlist.pins.map(p => p.name).join(', ') || 'ninguno'}</div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
