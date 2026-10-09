import { create } from 'zustand';

export const useToolStore = create((set) => ({
  activeTool: 'select', // select, rect, poly, path, via
  snapGrid: 0.005, // 0.005 um manufacturing grid for GPDK045
  
  setActiveTool: (tool) => set({ activeTool: tool }),
  setSnapGrid: (grid) => set({ snapGrid: grid })
}));
