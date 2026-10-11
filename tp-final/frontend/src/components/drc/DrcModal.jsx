import React, { useState } from 'react';
import { useLayoutStore } from '../../store/useLayoutStore';
import { runDRC } from '../../utils/drcEngine';
import './DrcModal.css';

export default function DrcModal({ onClose }) {
  const { shapes, setDrcViolations, clearDrcViolations } = useLayoutStore();
  const [report, setReport] = useState(null);
  const [running, setRunning] = useState(false);

  const handleRun = () => {
    setRunning(true);
    setReport(null);

    setTimeout(() => {
      try {
        const result = runDRC(shapes);
        setReport(result);
        if (result.violations && result.violations.length > 0) {
          setDrcViolations(result.violations);
        } else {
          clearDrcViolations();
        }
      } catch (e) {
        setReport({
          pass: false,
          errors: ['Error interno al ejecutar DRC: ' + e.message],
          warnings: [],
          details: ['  ✘ Falla en el motor DRC: ' + e.message],
          violations: [],
          stats: { totalShapes: shapes.length, rulesChecked: 0, violationsCount: 1 }
        });
      }
      setRunning(false);
    }, 250);
  };

  const handleClear = () => {
    clearDrcViolations();
    setReport(null);
  };

  const getLineClass = (line) => {
    if (line.includes('✘') || line.startsWith('ERR')) return 'error';
    if (line.includes('⚠')) return 'warn';
    if (line.includes('✔')) return 'pass';
    if (line.startsWith('──')) return 'section';
    return '';
  };

  return (
    <div className="drc-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="drc-modal">

        {/* Header */}
        <div className="drc-modal-header">
          <div className="drc-title-group">
            <h2>🛡️ Design Rule Check (DRC)</h2>
            <span className="drc-subtitle">PDK GPDK045 45nm · assuraDRC.rul</span>
          </div>
          <button className="drc-close" onClick={onClose} title="Cerrar">×</button>
        </div>

        <div className="drc-body">

          {/* Ruledeck info card */}
          <div>
            <div className="drc-section-label">Conjunto de Reglas (Ruledeck)</div>
            <div className="drc-ruledeck-card">
              <div className="drc-ruledeck-info">
                <h3>Cadence GPDK045 (assuraDRC.rul)</h3>
                <p>Nwell, Active, Poly (45nm), Contacts (0.06µm), Metal1/Metal2, Vias y Extensiones</p>
              </div>
              <span className="drc-badge">GPDK045 · 45nm</span>
            </div>
          </div>

          {/* Info about current canvas */}
          <div>
            <div className="drc-section-label">Canvas Actual</div>
            <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
              <strong>{shapes.length}</strong> geometrías totales en el canvas —{' '}
              {shapes.filter(s => !s.layerId?.startsWith('Pin')).length} capas de proceso físico
            </div>
          </div>

          {/* Action buttons */}
          <div className="drc-actions-row">
            <button
              className="drc-run-btn"
              disabled={shapes.length === 0 || running}
              onClick={handleRun}
            >
              {running ? 'Verificando reglas DRC…' : '▶  Ejecutar Verificación DRC'}
            </button>
            {report && (
              <button className="drc-clear-btn" onClick={handleClear} title="Limpiar marcadores de DRC en el canvas">
                Limpiar Marcadores
              </button>
            )}
          </div>

          {/* Report output */}
          {report && (
            <div className="drc-report">
              <div className={`drc-report-banner ${report.pass ? 'pass' : 'fail'}`}>
                <span className="drc-report-icon">{report.pass ? '✅' : '❌'}</span>
                <span>
                  {report.pass
                    ? 'DRC LIMPIO — El layout cumple con todas las reglas de GPDK045'
                    : `DRC FALLÓ — Se detectaron ${report.errors.length} violación(es) de reglas de diseño`}
                </span>
              </div>

              {report.stats && (
                <div className="drc-stats-bar">
                  <span>Formas: <strong>{report.stats.totalShapes}</strong></span>
                  <span>Capas: <strong>{report.stats.layersAnalyzed}</strong></span>
                  <span>Reglas: <strong>{report.stats.rulesChecked}</strong></span>
                  <span>Violaciones: <strong style={{ color: report.pass ? '#4ade80' : '#f87171' }}>{report.stats.violationsCount}</strong></span>
                </div>
              )}

              {/* Lista interactiva de violaciones */}
              {report.violations && report.violations.length > 0 && (
                <div className="drc-violations-list">
                  {report.violations.map((v, i) => (
                    <div key={v.id || i} className="drc-violation-item">
                      <div className="drc-violation-left">
                        <span className="drc-violation-code">{v.ruleCode}</span>
                        <span className="drc-violation-layer">{v.layer}</span>
                        <span className="drc-violation-msg" title={v.message}>{v.message}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Consola detallada de reglas */}
              <div className="drc-report-body">
                {report.details.map((line, i) => (
                  <div key={i} className={`detail-line ${getLineClass(line)}`}>{line}</div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
