import { create } from 'zustand';

export const useLayoutStore = create((set) => ({
  shapes: [],
  history: [],
  selectedShapeIds: [],
  activeLayer: 'Metal1',
  libraryCells: [],
  activeInstance: null,
  projectName: 'mi_inversor',
  fitViewTrigger: 0,
  libraryRefreshTrigger: 0,
  drcViolations: [],
  
  // Layer visibility and lock state
  layersState: {}, // { Nwell: { visible: true, locked: false }, ... }
  
  // Actions
  setProjectName: (name) => set({ projectName: name }),
  triggerFitView: () => set((state) => ({ fitViewTrigger: state.fitViewTrigger + 1 })),
  triggerLibraryRefresh: () => set((state) => ({ libraryRefreshTrigger: state.libraryRefreshTrigger + 1 })),
  setDrcViolations: (violations) => set({ drcViolations: violations }),
  clearDrcViolations: () => set({ drcViolations: [] }),
  setLibraryCells: (cells) => set({ libraryCells: cells }),
  setActiveInstance: (instance) => set({ activeInstance: instance }),
  setLayersState: (newState) => set({ layersState: newState }),
  toggleLayerVisibility: (layerId) => set((state) => {
    const currentState = state.layersState[layerId] || { visible: true, locked: false };
    return {
      layersState: {
        ...state.layersState,
        [layerId]: { ...currentState, visible: !currentState.visible }
      }
    };
  }),
  toggleLayerLock: (layerId) => set((state) => {
    const currentState = state.layersState[layerId] || { visible: true, locked: false };
    return {
      layersState: {
        ...state.layersState,
        [layerId]: { ...currentState, locked: !currentState.locked }
      }
    };
  }),
  setActiveLayer: (layerId) => set({ activeLayer: layerId }),
  
  addShape: (shape) => set((state) => ({ 
    history: [...state.history, state.shapes].slice(-50), // keep last 50 states
    shapes: [...state.shapes, shape] 
  })),
  addShapes: (newShapes) => set((state) => ({
    history: [...state.history, state.shapes].slice(-50),
    shapes: [...state.shapes, ...newShapes]
  })),
  updateShape: (id, newProps) => set((state) => ({
    history: [...state.history, state.shapes].slice(-50),
    shapes: state.shapes.map(s => s.id === id ? { ...s, ...newProps } : s)
  })),
  moveShapes: (ids, dx, dy) => set((state) => ({
    history: [...state.history, state.shapes].slice(-50),
    shapes: state.shapes.map(s => {
      if (!ids.includes(s.id)) return s;
      return {
        ...s,
        x: Math.round((s.x + dx) * 10000) / 10000,
        y: Math.round((s.y + dy) * 10000) / 10000
      };
    })
  })),
  deleteShapes: (ids) => set((state) => ({
    history: [...state.history, state.shapes].slice(-50),
    shapes: state.shapes.filter(s => !ids.includes(s.id)),
    selectedShapeIds: state.selectedShapeIds.filter(id => !ids.includes(id))
  })),
  setSelection: (ids) => set({ selectedShapeIds: ids }),
  clearSelection: () => set({ selectedShapeIds: [] }),
  
  undo: () => set((state) => {
    if (state.history.length === 0) return state;
    const previousShapes = state.history[state.history.length - 1];
    return {
      history: state.history.slice(0, -1),
      shapes: previousShapes,
      selectedShapeIds: []
    };
  }),
  
  // Entire load: updates shapes, triggers fit view, and optionally updates project name
  loadProject: (shapes, name) => set((state) => ({
    shapes: Array.isArray(shapes) ? shapes : [],
    selectedShapeIds: [],
    history: [],
    drcViolations: [],
    fitViewTrigger: state.fitViewTrigger + 1,
    ...(name ? { projectName: name } : {})
  }))
}));
