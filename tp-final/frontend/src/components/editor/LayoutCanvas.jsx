import React, { useRef, useState, useEffect } from 'react';
import { Stage, Layer, Rect, Group, Line, Text } from 'react-konva';
import { useLayoutStore } from '../../store/useLayoutStore';
import { useToolStore } from '../../store/useToolStore';
import { GPDK045_LAYERS } from '../../data/gpdk045_layers';
import GridLayer from './GridLayer';
import { getStipplePattern } from '../../utils/stipplePatterns';
import './LayoutCanvas.css';

export default function LayoutCanvas() {
  const { shapes, activeLayer, activeInstance, setActiveInstance, addShape, addShapes, updateShape, moveShapes, layersState, selectedShapeIds, setSelection, clearSelection, deleteShapes, undo, fitViewTrigger, drcViolations } = useLayoutStore();
  const { activeTool, snapGrid, setActiveTool } = useToolStore();
  
  const [scale, setScale] = useState(1000); // 1 um = 1000 px initial zoom
  const [position, setPosition] = useState({ x: 200, y: 200 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [draftShape, setDraftShape] = useState(null);
  const [selectionRect, setSelectionRect] = useState({ startX: 0, startY: 0, width: 0, height: 0, visible: false });
  const [rulerState, setRulerState] = useState({ startX: 0, startY: 0, endX: 0, endY: 0, active: false, visible: false });
  const [previewVias, setPreviewVias] = useState([]);
  const [draftPath, setDraftPath] = useState(null);
  const [currentPointer, setCurrentPointer] = useState({ x: 0, y: 0 });
  const [previewInstance, setPreviewInstance] = useState(null);
  const [probedNets, setProbedNets] = useState([]);
  const [moveState, setMoveState] = useState(null); // { origin: {x,y}, current: {x,y}, isDragging: bool }

  const getLayerWidth = (layerId) => {
    if (layerId === 'Metal1') return 0.065;
    if (layerId === 'Metal2') return 0.070;
    if (layerId === 'Poly') return 0.045;
    return 0.065;
  };
  
  const stageRef = useRef(null);
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight
        });
      }
    };
    window.addEventListener('resize', updateSize);
    updateSize();
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    if (containerRef.current) {
      if (activeTool === 'move') {
        containerRef.current.style.cursor = 'move';
      } else if (activeTool === 'select') {
        containerRef.current.style.cursor = 'default';
      } else {
        containerRef.current.style.cursor = 'crosshair';
      }
    }
  }, [activeTool]);

  useEffect(() => {
    if (activeTool !== 'via') setPreviewVias([]);
    if (activeTool !== 'path') setDraftPath(null);
    if (activeTool !== 'instance') setPreviewInstance(null);
    if (activeTool !== 'probe') setProbedNets([]);
    if (activeTool !== 'move') setMoveState(null);
  }, [activeTool]);

  const commitPath = (path) => {
    if (!path || path.points.length < 2) return;
    const newShapes = [];
    for (let i = 0; i < path.points.length - 1; i++) {
      const p1 = path.points[i];
      const p2 = path.points[i + 1];
      
      const isHorizontal = p1.y === p2.y;
      const length = isHorizontal ? Math.abs(p2.x - p1.x) : Math.abs(p2.y - p1.y);
      if (length === 0) continue;

      const minX = Math.min(p1.x, p2.x);
      const minY = Math.min(p1.y, p2.y);
      const hw = path.width / 2;

      newShapes.push({
        id: Date.now().toString() + '-' + i,
        x: isHorizontal ? minX - hw : minX - hw,
        y: isHorizontal ? minY - hw : minY - hw,
        width: isHorizontal ? length + path.width : path.width,
        height: isHorizontal ? path.width : length + path.width,
        layerId: path.layerId
      });
    }
    if (newShapes.length > 0) addShapes(newShapes);
  };

  const getViasForPosition = (pos) => {
    const intersectingLayers = new Set();
    shapes.forEach(shape => {
      const isVisible = layersState[shape.layerId]?.visible !== false;
      if (isVisible) {
        const minX = Math.min(shape.x, shape.x + shape.width);
        const maxX = Math.max(shape.x, shape.x + shape.width);
        const minY = Math.min(shape.y, shape.y + shape.height);
        const maxY = Math.max(shape.y, shape.y + shape.height);
        
        if (pos.x >= minX && pos.x <= maxX && pos.y >= minY && pos.y <= maxY) {
          intersectingLayers.add(shape.layerId);
        }
      }
    });

    const hasMetal2 = intersectingLayers.has('Metal2');
    const hasMetal1 = intersectingLayers.has('Metal1');
    const hasPoly = intersectingLayers.has('Poly');
    const hasOxide = intersectingLayers.has('Oxide');

    let viasToAdd = [];
    if (hasMetal2 && (hasPoly || hasOxide)) {
      viasToAdd = ['Cont', 'Via1'];
    } else if (hasMetal1 && (hasPoly || hasOxide)) {
      viasToAdd = ['Cont'];
    } else if (hasMetal2 && hasMetal1) {
      viasToAdd = ['Via1'];
    }

    return viasToAdd.map((viaLayer, i) => {
      const size = viaLayer === 'Via1' ? 0.07 : 0.06;
      return {
        id: 'preview-' + viaLayer,
        x: pos.x - size / 2,
        y: pos.y - size / 2,
        width: size,
        height: size,
        layerId: viaLayer
      };
    });
  };

  const fitToView = (shapesToFit = shapes) => {
    if (!shapesToFit || shapesToFit.length === 0) {
      setPosition({ x: dimensions.width / 2, y: dimensions.height / 2 });
      setScale(1000);
      return;
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    shapesToFit.forEach(s => {
      const w = s.width || 0;
      const h = s.height || 0;
      const x1 = Math.min(s.x, s.x + w);
      const x2 = Math.max(s.x, s.x + w);
      const y1 = Math.min(s.y, s.y + h);
      const y2 = Math.max(s.y, s.y + h);
      if (x1 < minX) minX = x1;
      if (y1 < minY) minY = y1;
      if (x2 > maxX) maxX = x2;
      if (y2 > maxY) maxY = y2;
    });

    if (!isFinite(minX) || !isFinite(maxX)) return;

    const designWidth = maxX - minX;
    const designHeight = maxY - minY;
    const padding = 80;
    const availWidth = Math.max(dimensions.width - padding * 2, 100);
    const availHeight = Math.max(dimensions.height - padding * 2, 100);

    let newScale = 1000;
    if (designWidth > 0 && designHeight > 0) {
      const scaleX = availWidth / designWidth;
      const scaleY = availHeight / designHeight;
      newScale = Math.min(scaleX, scaleY);
      newScale = Math.max(100, Math.min(newScale, 5000));
    }

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    setPosition({
      x: Math.round(dimensions.width / 2 - centerX * newScale),
      y: Math.round(dimensions.height / 2 - centerY * newScale)
    });
    setScale(newScale);
  };

  useEffect(() => {
    if (fitViewTrigger > 0 && shapes.length > 0) {
      fitToView(shapes);
    }
  }, [fitViewTrigger]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      switch(e.key.toLowerCase()) {
        case 'f': fitToView(shapes); break;
        case 's': setActiveTool('select'); break;
        case 'r': setActiveTool('rect'); break;
        case 'p': setActiveTool('poly'); break;
        case 'w': setActiveTool('path'); break;
        case 'v': setActiveTool('via'); break;
        case 'd': setActiveTool('ruler'); break;
        case 'm': setActiveTool('move'); break;
        case 'n': setActiveTool('probe'); break;
        case 'u': undo(); break;
        case 'arrowleft':
          if (selectedShapeIds.length > 0) {
            e.preventDefault();
            const step = e.shiftKey ? snapGrid * 10 : snapGrid;
            moveShapes(selectedShapeIds, -step, 0);
          }
          break;
        case 'arrowright':
          if (selectedShapeIds.length > 0) {
            e.preventDefault();
            const step = e.shiftKey ? snapGrid * 10 : snapGrid;
            moveShapes(selectedShapeIds, step, 0);
          }
          break;
        case 'arrowup':
          if (selectedShapeIds.length > 0) {
            e.preventDefault();
            const step = e.shiftKey ? snapGrid * 10 : snapGrid;
            moveShapes(selectedShapeIds, 0, -step);
          }
          break;
        case 'arrowdown':
          if (selectedShapeIds.length > 0) {
            e.preventDefault();
            const step = e.shiftKey ? snapGrid * 10 : snapGrid;
            moveShapes(selectedShapeIds, 0, step);
          }
          break;
        case 'delete':
        case 'backspace':
          if (selectedShapeIds.length > 0) deleteShapes(selectedShapeIds);
          break;
        case 'enter':
          if (activeTool === 'path' && draftPath) {
            commitPath(draftPath);
            setDraftPath(null);
          }
          break;
        case 'escape':
          // Exit whatever mode/tool is active and return to select mode (default mode)
          setActiveTool('select');
          setActiveInstance(null);
          setPreviewInstance(null);
          setMoveState(null);
          setDraftPath(null);
          setDraftShape(null);
          setIsDrawing(false);
          setPreviewVias([]);
          setProbedNets([]);
          setRulerState({ startX: 0, startY: 0, endX: 0, endY: 0, active: false, visible: false });
          setSelectionRect({ startX: 0, startY: 0, width: 0, height: 0, visible: false });
          clearSelection();
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setActiveTool, setActiveInstance, selectedShapeIds, deleteShapes, moveShapes, clearSelection, undo, activeTool, draftPath, snapGrid, shapes]);

  // Wheel to zoom
  const handleWheel = (e) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const scaleBy = 1.1;
    const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;

    setScale(newScale);
    setPosition({
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    });
  };

  const getSnappedPointerPosition = () => {
    const stage = stageRef.current;
    const pointer = stage.getPointerPosition();
    const x = (pointer.x - stage.x()) / scale;
    const y = (pointer.y - stage.y()) / scale;
    
    // Snap to grid
    const snappedX = Math.round(x / snapGrid) * snapGrid;
    const snappedY = Math.round(y / snapGrid) * snapGrid;
    
    return { x: snappedX, y: snappedY };
  };

  const handleMouseDown = (e) => {
    if (e.evt.button !== 0) return; // Only left click
    
    if (activeTool === 'select') {
      // Clicked on empty canvas
      if (e.target === e.target.getStage()) {
        const pos = getSnappedPointerPosition();
        setSelectionRect({ startX: pos.x, startY: pos.y, width: 0, height: 0, visible: true });
        
        // If not holding shift, clear current selection
        if (!e.evt.shiftKey) {
          clearSelection();
        }
      }
      return;
    }

    if (activeTool === 'move') {
      const pos = getSnappedPointerPosition();
      if (!moveState) {
        // If no shapes currently selected, try to select the shape under cursor
        if (selectedShapeIds.length === 0) {
          let clickedShape = null;
          for (let i = shapes.length - 1; i >= 0; i--) {
            const s = shapes[i];
            if (layersState[s.layerId]?.visible !== false &&
                pos.x >= s.x && pos.x <= s.x + s.width &&
                pos.y >= s.y && pos.y <= s.y + s.height) {
              clickedShape = s;
              break;
            }
          }
          if (clickedShape) {
            setSelection([clickedShape.id]);
          }
        }
        setMoveState({ origin: pos, current: pos, isDragging: true });
      } else {
        // Second click: commit movement
        const dx = Math.round((pos.x - moveState.origin.x) / snapGrid) * snapGrid;
        const dy = Math.round((pos.y - moveState.origin.y) / snapGrid) * snapGrid;
        if ((dx !== 0 || dy !== 0) && selectedShapeIds.length > 0) {
          moveShapes(selectedShapeIds, dx, dy);
        }
        setMoveState(null);
        setActiveTool('select');
      }
      return;
    }

    if (activeTool === 'ruler') {
      const pos = getSnappedPointerPosition();
      setRulerState({ startX: pos.x, startY: pos.y, endX: pos.x, endY: pos.y, active: true, visible: true });
      return;
    }

    if (activeTool === 'probe') {
      const stage = stageRef.current;
      const rawPos = stage.getPointerPosition();
      const worldPos = {
        x: (rawPos.x - stage.x()) / scale,
        y: (rawPos.y - stage.y()) / scale
      };

      // Toggle off existing net if clicked
      let clickedExistingNetIdx = -1;
      for (let i = 0; i < probedNets.length; i++) {
        for (const s of probedNets[i].shapes) {
          if (worldPos.x >= s.x && worldPos.x <= s.x + s.width &&
              worldPos.y >= s.y && worldPos.y <= s.y + s.height) {
            clickedExistingNetIdx = i;
            break;
          }
        }
        if (clickedExistingNetIdx !== -1) break;
      }

      if (clickedExistingNetIdx !== -1) {
        const newNets = [...probedNets];
        newNets.splice(clickedExistingNetIdx, 1);
        setProbedNets(newNets);
        return;
      }

      const doShapesIntersect = (s1, s2) => {
        return (
          s1.x < s2.x + s2.width &&
          s1.x + s1.width > s2.x &&
          s1.y < s2.y + s2.height &&
          s1.y + s1.height > s2.y
        );
      };

      // Split Oxide shapes by Poly to simulate transistor channel barriers
      const polys = shapes.filter(s => s.layerId === 'Poly' && layersState['Poly']?.visible !== false);
      const oxides = shapes.filter(s => s.layerId === 'Oxide' && layersState['Oxide']?.visible !== false);
      const others = shapes.filter(s => s.layerId !== 'Oxide' && layersState[s.layerId]?.visible !== false);

      let effectiveOxides = [...oxides];
      for (const poly of polys) {
        let nextOxides = [];
        for (const ox of effectiveOxides) {
          if (doShapesIntersect(poly, ox)) {
            const ix = Math.max(ox.x, poly.x);
            const iy = Math.max(ox.y, poly.y);
            const iw = Math.min(ox.x + ox.width, poly.x + poly.width) - ix;
            const ih = Math.min(ox.y + ox.height, poly.y + poly.height) - iy;

            if (iy > ox.y) nextOxides.push({ ...ox, height: iy - ox.y, id: ox.id + '-t' });
            if (iy + ih < ox.y + ox.height) nextOxides.push({ ...ox, y: iy + ih, height: (ox.y + ox.height) - (iy + ih), id: ox.id + '-b' });
            if (ix > ox.x) nextOxides.push({ ...ox, width: ix - ox.x, y: iy, height: ih, id: ox.id + '-l' });
            if (ix + iw < ox.x + ox.width) nextOxides.push({ ...ox, x: ix + iw, width: (ox.x + ox.width) - (ix + iw), y: iy, height: ih, id: ox.id + '-r' });
          } else {
            nextOxides.push(ox);
          }
        }
        effectiveOxides = nextOxides;
      }

      const effectiveShapes = [...others, ...polys, ...effectiveOxides];

      let clickedShape = null;
      for (let i = effectiveShapes.length - 1; i >= 0; i--) {
        const s = effectiveShapes[i];
        if (worldPos.x >= s.x && worldPos.x <= s.x + s.width &&
            worldPos.y >= s.y && worldPos.y <= s.y + s.height) {
          clickedShape = s;
          break;
        }
      }

      if (!clickedShape) {
        setProbedNets([]);
        return;
      }

      const connectsTo = (layerA, layerB) => {
        if (layerA === layerB) return true;
        const pairs = [
          ['Metal1', 'Cont'], ['Poly', 'Cont'], ['Oxide', 'Cont'],
          ['Metal2', 'Via1'], ['Metal1', 'Via1']
        ];
        return pairs.some(([a, b]) => (layerA === a && layerB === b) || (layerA === b && layerB === a));
      };

      const visited = new Set();
      const queue = [clickedShape];
      visited.add(clickedShape.id);

      while (queue.length > 0) {
        const current = queue.shift();
        for (const other of effectiveShapes) {
          if (visited.has(other.id)) continue;
          if (connectsTo(current.layerId, other.layerId) && doShapesIntersect(current, other)) {
            visited.add(other.id);
            queue.push(other);
          }
        }
      }

      const netShapes = effectiveShapes.filter(s => visited.has(s.id));
      const randomColor = `hsl(${Math.random() * 360}, 100%, 50%)`;
      setProbedNets([...probedNets, { shapes: netShapes, color: randomColor }]);
      return;
    }

    if (activeTool === 'via') {
      if (previewVias.length > 0) {
        addShapes(previewVias.map((v, i) => ({ ...v, id: Date.now().toString() + i })));
      }
      return;
    }

    if (activeTool === 'path') {
      const pos = getSnappedPointerPosition();
      let newPos = pos;

      if (draftPath) {
        const lastPoint = draftPath.points[draftPath.points.length - 1];
        if (activeLayer === 'Metal1') {
          newPos = { x: pos.x, y: lastPoint.y };
        } else if (activeLayer === 'Metal2') {
          newPos = { x: lastPoint.x, y: pos.y };
        } else {
          if (Math.abs(pos.x - lastPoint.x) > Math.abs(pos.y - lastPoint.y)) {
            newPos = { x: pos.x, y: lastPoint.y };
          } else {
            newPos = { x: lastPoint.x, y: pos.y };
          }
        }
        setDraftPath({ ...draftPath, points: [...draftPath.points, newPos] });
      } else {
        setDraftPath({ points: [pos], width: getLayerWidth(activeLayer), layerId: activeLayer });
      }
      return;
    }

    if (activeTool === 'instance' && activeInstance) {
      const pos = getSnappedPointerPosition();
      const newShapes = activeInstance.shapes.map((s, idx) => ({
        ...s,
        id: Date.now().toString() + '-' + idx,
        x: s.x + pos.x,
        y: s.y + pos.y
      }));
      addShapes(newShapes);
      return;
    }

    if (activeTool === 'rect') {
      setIsDrawing(true);
      const pos = getSnappedPointerPosition();
      setDraftShape({ x: pos.x, y: pos.y, width: 0, height: 0, layerId: activeLayer });
    }
  };

  const handleMouseMove = (e) => {
    if (activeTool === 'move' && moveState) {
      const pos = getSnappedPointerPosition();
      setMoveState(prev => prev ? { ...prev, current: pos } : null);
      return;
    }

    if (activeTool === 'instance' && activeInstance) {
      const pos = getSnappedPointerPosition();
      setPreviewInstance({ x: pos.x, y: pos.y });
      return;
    }

    if (activeTool === 'path' && draftPath) {
      const pos = getSnappedPointerPosition();
      const lastPoint = draftPath.points[draftPath.points.length - 1];
      let newPos = pos;
      
      if (activeLayer === 'Metal1') {
        newPos = { x: pos.x, y: lastPoint.y };
      } else if (activeLayer === 'Metal2') {
        newPos = { x: lastPoint.x, y: pos.y };
      } else {
        if (Math.abs(pos.x - lastPoint.x) > Math.abs(pos.y - lastPoint.y)) {
          newPos = { x: pos.x, y: lastPoint.y };
        } else {
          newPos = { x: lastPoint.x, y: pos.y };
        }
      }
      setCurrentPointer(newPos);
      return;
    }

    if (activeTool === 'ruler' && rulerState.active) {
      const pos = getSnappedPointerPosition();
      setRulerState(prev => ({ ...prev, endX: pos.x, endY: pos.y }));
      return;
    }

    if (activeTool === 'via') {
      const pos = getSnappedPointerPosition();
      setPreviewVias(getViasForPosition(pos));
      return;
    }

    if (activeTool === 'select' && selectionRect.visible) {
      const pos = getSnappedPointerPosition();
      setSelectionRect(prev => ({
        ...prev,
        width: pos.x - prev.startX,
        height: pos.y - prev.startY
      }));
      return;
    }

    if (!isDrawing) return;
    const pos = getSnappedPointerPosition();
    setDraftShape(prev => ({
      ...prev,
      width: pos.x - prev.startX || pos.x - prev.x, // Fallback safely
      height: pos.y - prev.startY || pos.y - prev.y
    }));
  };

  const handleMouseUp = (e) => {
    if (activeTool === 'move' && moveState?.isDragging) {
      const pos = getSnappedPointerPosition();
      const dx = Math.round((pos.x - moveState.origin.x) / snapGrid) * snapGrid;
      const dy = Math.round((pos.y - moveState.origin.y) / snapGrid) * snapGrid;
      if (dx !== 0 || dy !== 0) {
        if (selectedShapeIds.length > 0) {
          moveShapes(selectedShapeIds, dx, dy);
        }
        setMoveState(null);
        setActiveTool('select');
        return;
      } else {
        // Just a click without drag, keep moveState active for click-to-place
        setMoveState(prev => prev ? { ...prev, isDragging: false } : null);
        return;
      }
    }

    if (activeTool === 'ruler' && rulerState.active) {
      setRulerState(prev => ({ ...prev, active: false }));
      return;
    }

    if (activeTool === 'select' && selectionRect.visible) {
// ... existing logic follows
      const selBox = {
        x: Math.min(selectionRect.startX, selectionRect.startX + selectionRect.width),
        y: Math.min(selectionRect.startY, selectionRect.startY + selectionRect.height),
        width: Math.abs(selectionRect.width),
        height: Math.abs(selectionRect.height)
      };
      
      if (selBox.width > 0 && selBox.height > 0) {
        const selected = shapes.filter(shape => {
          const isVisible = layersState[shape.layerId]?.visible !== false;
          if (!isVisible) return false;
          
          // Intersection AABB
          return !(shape.x > selBox.x + selBox.width ||
                   shape.x + shape.width < selBox.x ||
                   shape.y > selBox.y + selBox.height ||
                   shape.y + shape.height < selBox.y);
        });
        
        const newSelectedIds = selected.map(s => s.id);
        
        if (e.evt.shiftKey) {
          // Add new selected to existing without duplicates
          const combined = new Set([...selectedShapeIds, ...newSelectedIds]);
          setSelection(Array.from(combined));
        } else {
          setSelection(newSelectedIds);
        }
      }
      setSelectionRect({ ...selectionRect, visible: false });
      return;
    }

    if (isDrawing && activeTool === 'rect') {
      setIsDrawing(false);
      if (Math.abs(draftShape.width) > 0 && Math.abs(draftShape.height) > 0) {
        const layerInfo = GPDK045_LAYERS.find(l => l.id === draftShape.layerId);
        const newShape = {
          id: Date.now().toString(),
          x: draftShape.width < 0 ? draftShape.x + draftShape.width : draftShape.x,
          y: draftShape.height < 0 ? draftShape.y + draftShape.height : draftShape.y,
          width: Math.abs(draftShape.width),
          height: Math.abs(draftShape.height),
          layerId: draftShape.layerId
        };
        // If it's a pin layer, ask for the pin name
        if (layerInfo?.type === 'pin') {
          const label = window.prompt('Nombre del pin (ej: VDD, VSS, IN, OUT):', '');
          if (label) {
            newShape.label = label.trim();
            addShape(newShape);
          }
        } else {
          addShape(newShape);
        }
      }
      setDraftShape(null);
    }
  };

  const dx = Math.abs(rulerState.endX - rulerState.startX);
  const dy = Math.abs(rulerState.endY - rulerState.startY);
  const distance = Math.sqrt(dx * dx + dy * dy);

  return (
    <div className="canvas-container" ref={containerRef}>
      <Stage
        width={dimensions.width}
        height={dimensions.height}
        onWheel={handleWheel}
        scaleX={scale}
        scaleY={scale}
        x={position.x}
        y={position.y}
        ref={stageRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDblClick={() => {
          if (activeTool === 'path' && draftPath) {
            commitPath(draftPath);
            setDraftPath(null);
          }
        }}
        draggable={activeTool === 'select' || true}
        dragBoundFunc={(pos) => pos}
        onDragStart={(e) => {
          if (e.evt && e.evt.button === 0) {
            e.target.stopDrag();
          }
        }}
      >
        <GridLayer scale={scale} width={dimensions.width} height={dimensions.height} position={position} snapGrid={snapGrid} />
        
        <Layer>
          {shapes.map(shape => {
            const isVisible = layersState[shape.layerId]?.visible !== false;
            if (!isVisible) return null;
            
            const layerInfo = GPDK045_LAYERS.find(l => l.id === shape.layerId);
            const isSelected = selectedShapeIds.includes(shape.id);
            const patternCanvas = layerInfo ? getStipplePattern(layerInfo.color, layerInfo.stipple) : null;
            
            // Pin shapes get special rendering with a label
            if (layerInfo?.type === 'pin') {
              return (
                <Group key={shape.id}>
                  <Rect
                    x={shape.x}
                    y={shape.y}
                    width={shape.width}
                    height={shape.height}
                    fill={layerInfo.color + '33'}
                    stroke={layerInfo.color}
                    strokeWidth={2 / scale}
                    dash={[4 / scale, 4 / scale]}
                  />
                  <Group
                    x={shape.x + shape.width / 2}
                    y={shape.y + shape.height / 2}
                    scaleX={1 / scale}
                    scaleY={1 / scale}
                  >
                    <Text
                      text={shape.label || '?'}
                      fontSize={11}
                      fill={layerInfo.color}
                      fontFamily="monospace"
                      fontStyle="bold"
                      align="center"
                      offsetX={20}
                      offsetY={7}
                    />
                  </Group>
                </Group>
              );
            }

            return (
              <Rect
                key={shape.id}
                x={shape.x}
                y={shape.y}
                width={shape.width}
                height={shape.height}
                fill={patternCanvas ? undefined : (layerInfo ? layerInfo.color : 'gray')}
                fillPatternImage={patternCanvas}
                fillPatternRepeat="repeat"
                fillPatternScaleX={1 / scale}
                fillPatternScaleY={1 / scale}
                opacity={isSelected ? (activeTool === 'move' && moveState ? 0.35 : 0.9) : 0.7}
                stroke={isSelected ? '#ffffff' : (layerInfo ? layerInfo.color : 'white')}
                strokeWidth={isSelected ? 3 / scale : 1 / scale}
                onClick={(e) => {
                  if (activeTool === 'select') {
                    e.cancelBubble = true;
                    if (e.evt.shiftKey) {
                      if (isSelected) {
                        setSelection(selectedShapeIds.filter(id => id !== shape.id));
                      } else {
                        setSelection([...selectedShapeIds, shape.id]);
                      }
                    } else {
                      setSelection([shape.id]);
                    }
                  }
                }}
                onMouseEnter={(e) => {
                  if (activeTool === 'select') {
                    e.target.getStage().container().style.cursor = 'pointer';
                  }
                }}
                onMouseLeave={(e) => {
                  e.target.getStage().container().style.cursor = 'crosshair';
                }}
              />
            );
          })}
          
          {draftShape && (
            <Rect
              x={draftShape.x}
              y={draftShape.y}
              width={draftShape.width}
              height={draftShape.height}
              fill="rgba(255,255,255,0.3)"
              stroke="white"
              strokeWidth={1 / scale}
              dash={[4 / scale, 4 / scale]}
            />
          )}

          {previewInstance && activeInstance && (
            <Group x={previewInstance.x} y={previewInstance.y} opacity={0.6}>
              {activeInstance.shapes.map((s, idx) => {
                const layerInfo = GPDK045_LAYERS.find(l => l.id === s.layerId);
                const patternCanvas = layerInfo ? getStipplePattern(layerInfo.color, layerInfo.stipple) : null;
                return (
                  <Rect
                    key={`prev-inst-${idx}`}
                    x={s.x}
                    y={s.y}
                    width={s.width}
                    height={s.height}
                    fill={patternCanvas ? undefined : (layerInfo ? layerInfo.color : 'gray')}
                    fillPatternImage={patternCanvas}
                    fillPatternRepeat="repeat"
                    fillPatternScaleX={1 / scale}
                    fillPatternScaleY={1 / scale}
                    stroke="cyan"
                    strokeWidth={1 / scale}
                  />
                );
              })}
            </Group>
          )}

          {draftPath && (
            <Group>
              <Line
                points={draftPath.points.flatMap(p => [p.x, p.y]).concat([currentPointer.x, currentPointer.y])}
                stroke={GPDK045_LAYERS.find(l => l.id === draftPath.layerId)?.color || 'white'}
                strokeWidth={draftPath.width}
                opacity={0.7}
                lineCap="square"
                lineJoin="miter"
              />
            </Group>
          )}

          {selectionRect.visible && (
            <Rect
              x={selectionRect.width < 0 ? selectionRect.startX + selectionRect.width : selectionRect.startX}
              y={selectionRect.height < 0 ? selectionRect.startY + selectionRect.height : selectionRect.startY}
              width={Math.abs(selectionRect.width)}
              height={Math.abs(selectionRect.height)}
              fill="rgba(0, 162, 255, 0.2)"
              stroke="#00A2FF"
              strokeWidth={1 / scale}
            />
          )}

          {probedNets.map((net, nIdx) => (
            <Group key={`net-${nIdx}`}>
              {net.shapes.map((s, sIdx) => (
                  <Rect
                    key={`net-${nIdx}-${sIdx}`}
                    x={s.x}
                    y={s.y}
                    width={s.width}
                    height={s.height}
                    fill="transparent"
                    stroke={net.color}
                    strokeWidth={4 / scale}
                    shadowColor={net.color}
                    shadowBlur={10 / scale}
                    shadowOpacity={0.8}
                  />
              ))}
            </Group>
          ))}

          {previewVias.map((shape, idx) => {
            const layerInfo = GPDK045_LAYERS.find(l => l.id === shape.layerId);
            const patternCanvas = layerInfo ? getStipplePattern(layerInfo.color, layerInfo.stipple) : null;
            return (
              <Rect
                key={`preview-${idx}`}
                x={shape.x}
                y={shape.y}
                width={shape.width}
                height={shape.height}
                fill={patternCanvas ? undefined : (layerInfo ? layerInfo.color : 'gray')}
                fillPatternImage={patternCanvas}
                fillPatternRepeat="repeat"
                fillPatternScaleX={1 / scale}
                fillPatternScaleY={1 / scale}
                opacity={1}
                stroke="#FFFFFF"
                strokeWidth={2 / scale}
                shadowColor="#FFFFFF"
                shadowBlur={15 / scale}
                shadowOpacity={1}
              />
            );
          })}

          {rulerState.visible && (
            <Group>
              {/* Euclidean Distance Line */}
              <Line 
                points={[rulerState.startX, rulerState.startY, rulerState.endX, rulerState.endY]} 
                stroke="#FFFF00" 
                strokeWidth={2 / scale} 
                dash={[4 / scale, 4 / scale]} 
              />
              
              {/* Tooltip Text - Inverse scaled to render sharply in screen pixels */}
              <Group
                x={rulerState.endX}
                y={rulerState.endY}
                scaleX={1 / scale}
                scaleY={1 / scale}
              >
                <Rect 
                  x={10} 
                  y={10} 
                  width={150} 
                  height={65} 
                  fill="rgba(255, 255, 255, 0.95)" 
                  stroke="#333333"
                  strokeWidth={1}
                  shadowColor="black"
                  shadowBlur={5}
                  shadowOffset={{ x: 2, y: 2 }}
                  shadowOpacity={0.4}
                  cornerRadius={4} 
                />
                <Text
                  x={18}
                  y={18}
                  text={`Dist: ${distance.toFixed(3)} µm\ndX:   ${dx.toFixed(3)} µm\ndY:   ${dy.toFixed(3)} µm`}
                  fontSize={14}
                  lineHeight={1.4}
                  fill="#000000"
                  fontFamily="monospace"
                  fontStyle="bold"
                />
              </Group>
            </Group>
          )}

          {/* Move Tool Preview */}
          {activeTool === 'move' && moveState && selectedShapeIds.length > 0 && (() => {
            const dx = Math.round((moveState.current.x - moveState.origin.x) / snapGrid) * snapGrid;
            const dy = Math.round((moveState.current.y - moveState.origin.y) / snapGrid) * snapGrid;
            const selectedShapes = shapes.filter(s => selectedShapeIds.includes(s.id));
            return (
              <Group>
                {/* Reference line connecting origin to current pointer */}
                <Line
                  points={[moveState.origin.x, moveState.origin.y, moveState.current.x, moveState.current.y]}
                  stroke="#00FFCC"
                  strokeWidth={1.5 / scale}
                  dash={[4 / scale, 4 / scale]}
                />
                
                {/* Distance / Delta badge */}
                <Group x={moveState.current.x} y={moveState.current.y} scaleX={1 / scale} scaleY={1 / scale}>
                  <Rect
                    x={10}
                    y={-28}
                    width={170}
                    height={22}
                    fill="#15171e"
                    stroke="#00FFCC"
                    strokeWidth={1.5}
                    cornerRadius={4}
                    opacity={0.92}
                  />
                  <Text
                    x={16}
                    y={-23}
                    text={`ΔX: ${dx >= 0 ? '+' : ''}${dx.toFixed(3)}  ΔY: ${dy >= 0 ? '+' : ''}${dy.toFixed(3)} μm`}
                    fill="#00FFCC"
                    fontSize={11}
                    fontFamily="monospace"
                    fontStyle="bold"
                  />
                </Group>

                {/* Ghost preview of moved shapes */}
                {selectedShapes.map(s => {
                  const layerInfo = GPDK045_LAYERS.find(l => l.id === s.layerId);
                  return (
                    <Rect
                      key={`move-ghost-${s.id}`}
                      x={s.x + dx}
                      y={s.y + dy}
                      width={s.width}
                      height={s.height}
                      fill={layerInfo ? layerInfo.color + '55' : 'rgba(0, 255, 204, 0.3)'}
                      stroke="#00FFCC"
                      strokeWidth={2 / scale}
                      dash={[4 / scale, 3 / scale]}
                    />
                  );
                })}
              </Group>
            );
          })()}

          {/* Marcadores de Violaciones DRC en Canvas */}
          {drcViolations && drcViolations.map((v, vIdx) => {
            if (!v.bbox) return null;
            return (
              <Group key={`drc-marker-${v.id || vIdx}`}>
                <Rect
                  x={v.bbox.x}
                  y={v.bbox.y}
                  width={v.bbox.width}
                  height={v.bbox.height}
                  fill="rgba(239, 68, 68, 0.28)"
                  stroke="#ef4444"
                  strokeWidth={2 / scale}
                  dash={[4 / scale, 3 / scale]}
                />
                <Group
                  x={v.bbox.x + v.bbox.width / 2}
                  y={v.bbox.y - 12 / scale}
                  scaleX={1 / scale}
                  scaleY={1 / scale}
                >
                  <Text
                    text={`⚠️ ${v.ruleCode}`}
                    fontSize={11}
                    fill="#fecaca"
                    fontFamily="monospace"
                    fontStyle="bold"
                    align="center"
                    offsetX={30}
                    offsetY={6}
                    shadowColor="#000"
                    shadowBlur={4}
                  />
                </Group>
              </Group>
            );
          })}
        </Layer>
      </Stage>
    </div>
  );
}
