import React from 'react';
import { Layer, Line } from 'react-konva';

export default function GridLayer({ scale, width, height, position, snapGrid }) {
  // A simple representation of axes for now
  return (
    <Layer listening={false}>
      {/* X Axis */}
      <Line points={[-10000, 0, 10000, 0]} stroke="#333" strokeWidth={1 / scale} />
      {/* Y Axis */}
      <Line points={[0, -10000, 0, 10000]} stroke="#333" strokeWidth={1 / scale} />
    </Layer>
  );
}
