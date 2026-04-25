'use client';

import { useEffect, useRef } from 'react';

const REGION_DEFS = [
  { id: 'village',    name: 'Village',       x: 5,  y: 5,  w: 14, h: 12, color: '#4a7a4a' },
  { id: 'forest_w',  name: 'West Forest',   x: 0,  y: 0,  w: 8,  h: 48, color: '#2d5a27' },
  { id: 'forest_e',  name: 'East Forest',   x: 40, y: 0,  w: 24, h: 48, color: '#2d5a27' },
  { id: 'deep_forest',name:'Deep Forest',   x: 8,  y: 0,  w: 16, h: 8,  color: '#1a3a14' },
  { id: 'river',     name: 'Riverside',     x: 22, y: 10, w: 8,  h: 28, color: '#1a5a8a' },
  { id: 'ruins',     name: 'Ancient Ruins', x: 44, y: 18, w: 14, h: 14, color: '#5a4a30' },
  { id: 'cliff',     name: 'Stone Cliffs',  x: 8,  y: 36, w: 20, h: 12, color: '#5a5040' },
  { id: 'camp',      name: 'Old Camp',      x: 30, y: 36, w: 14, h: 12, color: '#6a5020' },
];

const MAP_W = 64, MAP_H = 48;
const CHUNK = 4; // fog chunk size in tiles

export default function WorldMap({ fog, playerPos, npcs, tileSize, onClose }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const cw = canvas.width, ch = canvas.height;
    const scaleX = cw / MAP_W, scaleY = ch / MAP_H;

    ctx.clearRect(0, 0, cw, ch);

    // Background
    ctx.fillStyle = '#0a0a14';
    ctx.fillRect(0, 0, cw, ch);

    // Draw regions
    for (const r of REGION_DEFS) {
      const rx = r.x * scaleX, ry = r.y * scaleY;
      const rw = r.w * scaleX, rh = r.h * scaleY;
      ctx.fillStyle = r.color + '88';
      ctx.fillRect(rx, ry, rw, rh);
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 1;
      ctx.strokeRect(rx, ry, rw, rh);
    }

    // River overlay
    ctx.fillStyle = '#1a5a8aaa';
    ctx.fillRect(22 * scaleX, 10 * scaleY, 8 * scaleX, 28 * scaleY);

    // Fog of war
    if (fog) {
      const chunksX = Math.ceil(MAP_W / CHUNK);
      const chunksY = Math.ceil(MAP_H / CHUNK);
      for (let cy = 0; cy < chunksY; cy++) {
        for (let cx = 0; cx < chunksX; cx++) {
          const explored = fog.isExplored(cx, cy);
          if (!explored) {
            ctx.fillStyle = 'rgba(0,0,0,0.82)';
            ctx.fillRect(
              cx * CHUNK * scaleX, cy * CHUNK * scaleY,
              CHUNK * scaleX + 1,  CHUNK * scaleY + 1
            );
          }
        }
      }
    }

    // Region labels (only for explored areas)
    ctx.font = `bold ${Math.max(7, scaleX * 1.6)}px monospace`;
    ctx.textAlign = 'center';
    for (const r of REGION_DEFS) {
      const cx = (r.x + r.w / 2) * scaleX;
      const cy = (r.y + r.h / 2) * scaleY;
      const chunkCx = Math.floor((r.x + r.w / 2) / CHUNK);
      const chunkCy = Math.floor((r.y + r.h / 2) / CHUNK);
      if (!fog || fog.isExplored(chunkCx, chunkCy)) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(cx - r.name.length * 3.5, cy - 7, r.name.length * 7 + 4, 11);
        ctx.fillStyle = '#ddd';
        ctx.fillText(r.name, cx, cy + 3);
      }
    }

    // NPC markers
    if (npcs) {
      for (const npc of npcs) {
        const nx = (npc.x / (MAP_W * tileSize)) * cw;
        const ny = (npc.y / (MAP_H * tileSize)) * ch;
        const chunkCx = Math.floor((npc.x / tileSize) / CHUNK);
        const chunkCy = Math.floor((npc.y / tileSize) / CHUNK);
        if (!fog || fog.isExplored(chunkCx, chunkCy)) {
          ctx.fillStyle = '#ffd700';
          ctx.beginPath();
          ctx.arc(nx, ny, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.font = '7px monospace';
          ctx.fillStyle = '#ffd700';
          ctx.fillText(npc.name, nx + 5, ny + 3);
        }
      }
    }

    // Player position
    if (playerPos) {
      const px = (playerPos.x / (MAP_W * tileSize)) * cw;
      const py = (playerPos.y / (MAP_H * tileSize)) * ch;
      // Pulsing dot
      const pulse = 0.7 + Math.sin(Date.now() / 300) * 0.3;
      ctx.save();
      ctx.globalAlpha = pulse;
      ctx.fillStyle = '#00ff88';
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
      // You are here label
      ctx.font = '8px monospace';
      ctx.fillStyle = '#00ff88';
      ctx.textAlign = 'left';
      ctx.fillText('▶ YOU', px + 6, py + 3);
    }

    ctx.textAlign = 'left';
  });

  const explored = fog ? fog.exploredPercent : 0;

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 110, fontFamily: 'monospace',
    }}>
      <div style={{
        background: 'linear-gradient(135deg,#080c08,#08080f)',
        border: '2px solid #2a4a2a',
        borderRadius: 10, padding: 16,
        boxShadow: '0 0 40px rgba(0,0,0,0.9), 0 0 20px rgba(40,120,40,0.12)',
        maxWidth: 640, width: '90vw',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ color: '#7cbe7c', fontSize: 13, letterSpacing: 2 }}>
            🗺️ WORLD MAP
          </span>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span style={{ color: '#555', fontSize: 9 }}>
              Explored: {explored}%
            </span>
            <button onClick={onClose} style={{
              background: 'none', border: '1px solid #4a2a2a',
              color: '#be7c7c', cursor: 'pointer', borderRadius: 3,
              padding: '2px 8px', fontSize: 11,
            }}>✕</button>
          </div>
        </div>

        {/* Map canvas */}
        <canvas
          ref={canvasRef}
          width={580} height={400}
          style={{ width: '100%', height: 'auto', borderRadius: 4, border: '1px solid #1a3a1a' }}
        />

        {/* Legend */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', marginTop: 10 }}>
          {[
            { color: '#00ff88', label: '▶ Player' },
            { color: '#ffd700', label: '● NPC' },
            { color: '#2d5a27', label: '▪ Forest' },
            { color: '#1a5a8a', label: '▪ River' },
            { color: '#5a4a30', label: '▪ Ruins' },
            { color: '#5a5040', label: '▪ Cliffs' },
          ].map(({ color, label }) => (
            <span key={label} style={{ color, fontSize: 9, letterSpacing: 1 }}>{label}</span>
          ))}
          <span style={{ color: '#333', fontSize: 9, letterSpacing: 1 }}>■ Unexplored</span>
        </div>

        <div style={{ color: '#2a4a2a', fontSize: 9, marginTop: 8, textAlign: 'center', letterSpacing: 1 }}>
          Press [M] to close
        </div>
      </div>
    </div>
  );
}
