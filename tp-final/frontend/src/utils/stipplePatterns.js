const cache = {};

export const getStipplePattern = (color, type) => {
  if (type === 'solid' || !type) return null;
  const key = `${color}-${type}`;
  if (cache[key]) return cache[key];

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  const size = 8;
  canvas.width = size;
  canvas.height = size;

  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();

  switch (type) {
    case 'diagonal':
      // Top-right to bottom-left
      ctx.moveTo(size + 1, -1);
      ctx.lineTo(-1, size + 1);
      break;
    case 'horizontal':
      ctx.moveTo(0, size / 2);
      ctx.lineTo(size, size / 2);
      break;
    case 'vertical':
      ctx.moveTo(size / 2, 0);
      ctx.lineTo(size / 2, size);
      break;
    case 'crosshatch':
      // Diagonal cross
      ctx.moveTo(size + 1, -1);
      ctx.lineTo(-1, size + 1);
      ctx.moveTo(-1, -1);
      ctx.lineTo(size + 1, size + 1);
      break;
    case 'x-mark':
      // X mark bounded
      ctx.moveTo(2, 2);
      ctx.lineTo(size - 2, size - 2);
      ctx.moveTo(2, size - 2);
      ctx.lineTo(size - 2, 2);
      break;
    default:
      return null;
  }
  
  ctx.stroke();
  cache[key] = canvas;
  return canvas;
};

export const getStippleDataUrl = (color, type) => {
  if (type === 'solid' || !type) return '';
  const canvas = getStipplePattern(color, type);
  return canvas ? `url(${canvas.toDataURL()})` : '';
};
