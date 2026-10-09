import React from 'react';
import { useLayoutStore } from '../store/useLayoutStore';
import { useToolStore } from '../store/useToolStore';
import LayoutCanvas from '../components/editor/LayoutCanvas';
import LayerPanel from '../components/lsw/LayerPanel';
import Header from '../components/header/Header';
import Toolbar from '../components/toolbar/Toolbar';
import LibraryPanel from '../components/library/LibraryPanel';

export default function Editor() {
  return (
    <div className="app-container">
      <Header />
      <Toolbar />
      <div className="main-content">
        <LayerPanel />
        <LayoutCanvas />
        <LibraryPanel />
      </div>
    </div>
  );
}
