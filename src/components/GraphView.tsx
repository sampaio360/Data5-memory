import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useVault } from '../context/VaultContext';
import { ZoomIn, ZoomOut, RefreshCw, X, Settings, Brain, Plus, Trash2 } from 'lucide-react';

interface GraphNode {
  id: string;
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  resolved: boolean;
}

interface GraphLink {
  source: string;
  target: string;
  resolved: boolean;
}

interface GraphGroup {
  query: string;
  color: string;
}

interface GraphSettings {
  nodeColor: string;
  nodeColorUnresolved: string;
  lineColor: string;
  lineColorUnresolved: string;
  lineThickness: number;
  nodeSize: number;
  labelSize: number;
  showLabels: boolean;
  showPulses: boolean;
  showBrain: boolean;
  brainSize: number;
  brainOpacity: number;
  brainRotation: number;
  brainRotationSpeed: number;
  // Filters
  searchQuery: string;
  showOrphans: boolean;
  showUnresolved: boolean;
  // Groups
  groups: GraphGroup[];
  // Forces
  repelForce: number;
  linkForce: number;
  centerForce: number;
  linkDistance: number;
  damping: number;
}

const DEFAULT_SETTINGS: GraphSettings = {
  nodeColor: '#c69ef0',
  nodeColorUnresolved: '#ff6b6b',
  lineColor: '#7b42bc',
  lineColorUnresolved: '#ff6b6b',
  lineThickness: 1.2,
  nodeSize: 1.0,
  labelSize: 10,
  showLabels: true,
  showPulses: true,
  showBrain: true,
  brainSize: 1.2,
  brainOpacity: 0.5,
  brainRotation: 0,
  brainRotationSpeed: 1.0,
  searchQuery: '',
  showOrphans: true,
  showUnresolved: true,
  groups: [],
  repelForce: 180,
  linkForce: 0.05,
  centerForce: 0.015,
  linkDistance: 100,
  damping: 0.82,
};

interface GraphViewProps {
  onClose: () => void;
}

// ─────────────────────────────────────────────────────────────
// Brain outline path helper – returns a Path2D of the full
// brain silhouette (both hemispheres + stem) at scale s.
// ─────────────────────────────────────────────────────────────
function createBrainPath(s: number): Path2D {
  const p = new Path2D();

  // Left hemisphere
  p.moveTo(-5 * s, -85 * s);
  p.bezierCurveTo(-30 * s, -95 * s, -70 * s, -90 * s, -85 * s, -70 * s);
  p.bezierCurveTo(-100 * s, -50 * s, -105 * s, -25 * s, -100 * s, 0);
  p.bezierCurveTo(-105 * s, 15 * s, -100 * s, 40 * s, -90 * s, 55 * s);
  p.bezierCurveTo(-80 * s, 70 * s, -65 * s, 80 * s, -50 * s, 85 * s);
  p.bezierCurveTo(-35 * s, 90 * s, -20 * s, 88 * s, -5 * s, 82 * s);

  // Stem
  p.bezierCurveTo(-8 * s, 92 * s, -12 * s, 100 * s, -10 * s, 110 * s);
  p.bezierCurveTo(-6 * s, 118 * s, 6 * s, 118 * s, 10 * s, 110 * s);
  p.bezierCurveTo(12 * s, 100 * s, 8 * s, 92 * s, 5 * s, 82 * s);

  // Right hemisphere (mirrored)
  p.bezierCurveTo(20 * s, 88 * s, 35 * s, 90 * s, 50 * s, 85 * s);
  p.bezierCurveTo(65 * s, 80 * s, 80 * s, 70 * s, 90 * s, 55 * s);
  p.bezierCurveTo(100 * s, 40 * s, 105 * s, 15 * s, 100 * s, 0);
  p.bezierCurveTo(105 * s, -25 * s, 100 * s, -50 * s, 85 * s, -70 * s);
  p.bezierCurveTo(70 * s, -90 * s, 30 * s, -95 * s, 5 * s, -85 * s);

  p.closePath();
  return p;
}

/**
 * Draws a 3D transparent glass-like brain on the canvas.
 */
function draw3DBrain(ctx: CanvasRenderingContext2D, rawSize: number, rotation: number, opacity: number) {
  const s = rawSize / 200;
  const brainPath = createBrainPath(s);

  ctx.save();
  ctx.rotate(rotation);

  // ─── Layer 1: Deep interior fill (subtle warm grey) ───
  const innerGrad = ctx.createRadialGradient(0, -10 * s, 5 * s, 0, 10 * s, 110 * s);
  innerGrad.addColorStop(0, `rgba(180, 175, 195, ${0.07 * opacity})`);
  innerGrad.addColorStop(0.4, `rgba(150, 145, 165, ${0.05 * opacity})`);
  innerGrad.addColorStop(0.75, `rgba(120, 115, 140, ${0.035 * opacity})`);
  innerGrad.addColorStop(1, `rgba(90, 85, 110, ${0.015 * opacity})`);
  ctx.fillStyle = innerGrad;
  ctx.fill(brainPath);

  // ─── Layer 2: Rim / edge shadow (gives 3D depth) ───
  ctx.save();
  ctx.clip(brainPath);
  const rimGrad = ctx.createRadialGradient(0, 0, 40 * s, 0, 0, 105 * s);
  rimGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
  rimGrad.addColorStop(0.7, 'rgba(0, 0, 0, 0)');
  rimGrad.addColorStop(1, `rgba(100, 95, 130, ${0.08 * opacity})`);
  ctx.fillStyle = rimGrad;
  ctx.fillRect(-110 * s, -100 * s, 220 * s, 230 * s);
  ctx.restore();

  // ─── Layer 3: Specular highlight top-left (glass reflection) ───
  ctx.save();
  ctx.clip(brainPath);
  const specGrad = ctx.createRadialGradient(-30 * s, -50 * s, 5 * s, -25 * s, -40 * s, 55 * s);
  specGrad.addColorStop(0, `rgba(255, 255, 255, ${0.09 * opacity})`);
  specGrad.addColorStop(0.5, `rgba(255, 255, 255, ${0.03 * opacity})`);
  specGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = specGrad;
  ctx.fillRect(-110 * s, -100 * s, 220 * s, 230 * s);
  ctx.restore();

  // ─── Layer 4: Second smaller specular (top-right) ───
  ctx.save();
  ctx.clip(brainPath);
  const spec2 = ctx.createRadialGradient(40 * s, -55 * s, 3 * s, 35 * s, -45 * s, 35 * s);
  spec2.addColorStop(0, `rgba(255, 255, 255, ${0.06 * opacity})`);
  spec2.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = spec2;
  ctx.fillRect(-110 * s, -100 * s, 220 * s, 230 * s);
  ctx.restore();

  // ─── Layer 5: Outline strokes ───
  ctx.strokeStyle = `rgba(160, 155, 185, ${0.08 * opacity})`;
  ctx.lineWidth = 4 / (rawSize / 200);
  ctx.shadowColor = `rgba(180, 175, 210, ${0.15 * opacity})`;
  ctx.shadowBlur = 12;
  ctx.stroke(brainPath);
  ctx.shadowBlur = 0;

  ctx.strokeStyle = `rgba(170, 165, 195, ${0.18 * opacity})`;
  ctx.lineWidth = 1.5 / (rawSize / 200);
  ctx.stroke(brainPath);

  // ─── Layer 6: Sulci (brain folds) — left ───
  ctx.beginPath();
  ctx.moveTo(-75 * s, -50 * s);
  ctx.bezierCurveTo(-60 * s, -58 * s, -40 * s, -38 * s, -20 * s, -48 * s);
  ctx.moveTo(-88 * s, -18 * s);
  ctx.bezierCurveTo(-70 * s, -12 * s, -45 * s, -24 * s, -25 * s, -12 * s);
  ctx.moveTo(-92 * s, 12 * s);
  ctx.bezierCurveTo(-75 * s, 18 * s, -52 * s, 6 * s, -30 * s, 16 * s);
  ctx.moveTo(-84 * s, 42 * s);
  ctx.bezierCurveTo(-65 * s, 50 * s, -48 * s, 36 * s, -28 * s, 46 * s);
  ctx.moveTo(-62 * s, 66 * s);
  ctx.bezierCurveTo(-45 * s, 72 * s, -28 * s, 62 * s, -12 * s, 70 * s);
  ctx.strokeStyle = `rgba(160, 155, 185, ${0.08 * opacity})`;
  ctx.lineWidth = 1.2 / (rawSize / 200);
  ctx.stroke();

  // ─── Sulci — right ───
  ctx.beginPath();
  ctx.moveTo(75 * s, -50 * s);
  ctx.bezierCurveTo(60 * s, -58 * s, 40 * s, -38 * s, 20 * s, -48 * s);
  ctx.moveTo(88 * s, -18 * s);
  ctx.bezierCurveTo(70 * s, -12 * s, 45 * s, -24 * s, 25 * s, -12 * s);
  ctx.moveTo(92 * s, 12 * s);
  ctx.bezierCurveTo(75 * s, 18 * s, 52 * s, 6 * s, 30 * s, 16 * s);
  ctx.moveTo(84 * s, 42 * s);
  ctx.bezierCurveTo(65 * s, 50 * s, 48 * s, 36 * s, 28 * s, 46 * s);
  ctx.moveTo(62 * s, 66 * s);
  ctx.bezierCurveTo(45 * s, 72 * s, 28 * s, 62 * s, 12 * s, 70 * s);
  ctx.strokeStyle = `rgba(160, 155, 185, ${0.08 * opacity})`;
  ctx.lineWidth = 1.2 / (rawSize / 200);
  ctx.stroke();

  // ─── Central fissure ───
  ctx.beginPath();
  ctx.moveTo(0, -85 * s);
  ctx.lineTo(0, 82 * s);
  ctx.strokeStyle = `rgba(170, 165, 195, ${0.06 * opacity})`;
  ctx.lineWidth = 1.0 / (rawSize / 200);
  ctx.stroke();

  ctx.restore();
}

/** hex → rgba */
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ══════════════════════════════════════════════════════════════
// Component
// ══════════════════════════════════════════════════════════════
export const GraphView: React.FC<GraphViewProps> = ({ onClose }) => {
  const { nodes, getResolvedLinks, openFileInTab } = useVault();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const nodesRef = useRef<GraphNode[]>([]);
  const linksRef = useRef<GraphLink[]>([]);
  const panRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(1);
  const hoveredNodeRef = useRef<GraphNode | null>(null);
  const draggedNodeRef = useRef<GraphNode | null>(null);
  const settingsRef = useRef<GraphSettings>({ ...DEFAULT_SETTINGS });

  const [hoveredNodeName, setHoveredNodeName] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<GraphSettings>({ ...DEFAULT_SETTINGS });

  const dragStart = useRef({ x: 0, y: 0 });
  const panStart = useRef({ x: 0, y: 0 });
  const isPanning = useRef(false);

  useEffect(() => { settingsRef.current = settings; }, [settings]);

  const updateSetting = useCallback(<K extends keyof GraphSettings>(key: K, value: GraphSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  // Groups actions
  const addGroup = () => {
    setSettings(prev => ({
      ...prev,
      groups: [...prev.groups, { query: '', color: '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0') }]
    }));
  };

  const removeGroup = (index: number) => {
    setSettings(prev => ({
      ...prev,
      groups: prev.groups.filter((_, i) => i !== index)
    }));
  };

  const updateGroup = (index: number, field: keyof GraphGroup, value: string) => {
    setSettings(prev => {
      const copy = [...prev.groups];
      copy[index] = { ...copy[index], [field]: value };
      return { ...prev, groups: copy };
    });
  };

  // Init full graph nodes & connections. Physics engine will run simulation on these nodes.
  // Filters will decide which nodes to tick and render in real-time.
  useEffect(() => {
    const resolvedConns = getResolvedLinks();
    const fileNodes = nodes.filter(n => n.type === 'file');
    const nodeIds = new Set<string>();
    fileNodes.forEach(f => nodeIds.add(f.id));
    resolvedConns.forEach(c => { if (!c.resolved) nodeIds.add(c.target); });

    nodesRef.current = Array.from(nodeIds).map(id => {
      const ex = nodesRef.current.find(gn => gn.id === id);
      if (ex) return ex;
      const fn = fileNodes.find(f => f.id === id);
      const resolved = !!fn;
      const name = fn ? fn.name.replace(/\.md$/, '') : id;
      const angle = Math.random() * Math.PI * 2;
      const dist = 30 + Math.random() * 80;
      const deg = resolvedConns.filter(c => c.source === id || c.target === id).length;
      return {
        id, name,
        x: Math.cos(angle) * dist, y: Math.sin(angle) * dist,
        vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2,
        radius: resolved ? 6 + Math.min(deg * 1.2, 10) : 5,
        resolved
      };
    });
    linksRef.current = resolvedConns.map(c => ({ source: c.source, target: c.target, resolved: c.resolved }));
  }, [nodes]);

  const getCanvasCoords = (cx: number, cy: number) => {
    const c = canvasRef.current;
    if (!c) return { x: 0, y: 0 };
    const r = c.getBoundingClientRect();
    return {
      x: (cx - r.left - c.width / 2 - panRef.current.x) / zoomRef.current,
      y: (cy - r.top - c.height / 2 - panRef.current.y) / zoomRef.current
    };
  };

  // ── Main loop ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const resize = () => { if (canvas.parentElement) { canvas.width = canvas.parentElement.clientWidth; canvas.height = canvas.parentElement.clientHeight; } };
    resize();
    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    const tick = () => {
      const allNodes = nodesRef.current;
      const allLinks = linksRef.current;
      const drag = draggedNodeRef.current;
      const cfg = settingsRef.current;

      const time = performance.now();

      // Compute brain angle (fixed angle + auto-rotation speed)
      const currentRotationAngle = ((cfg.brainRotation + (time * 0.001 * cfg.brainRotationSpeed * 10)) % 360) * Math.PI / 180;

      // Compute brain scale for containment
      const brainRawSize = Math.min(canvas.width, canvas.height) * 0.7 * cfg.brainSize / zoomRef.current;
      const brainS = brainRawSize / 200;

      // ──────────────────────────────────────────
      // 1. FILTER NODES & LINKS IN REAL TIME
      // ──────────────────────────────────────────
      let activeNodes = allNodes;

      // Unresolved filter
      if (!cfg.showUnresolved) {
        activeNodes = activeNodes.filter(n => n.resolved);
      }

      // Search query filter (matches name, folder/path, content)
      if (cfg.searchQuery) {
        const q = cfg.searchQuery.toLowerCase();
        activeNodes = activeNodes.filter(n => {
          const vn = nodes.find(v => v.id === n.id);
          const nameMatch = n.name.toLowerCase().includes(q);
          const contentMatch = vn?.content?.toLowerCase().includes(q) || false;
          const pathMatch = vn?.parentId?.toLowerCase().includes(q) || false;
          return nameMatch || contentMatch || pathMatch;
        });
      }

      // Filter active links (both endpoints must be active)
      let activeLinks = allLinks.filter(l => 
        activeNodes.some(n => n.id === l.source) && activeNodes.some(n => n.id === l.target)
      );

      // Orphans filter
      if (!cfg.showOrphans) {
        activeNodes = activeNodes.filter(n => 
          activeLinks.some(l => l.source === n.id || l.target === n.id)
        );
        // Re-filter links after orphan cleanup
        activeLinks = allLinks.filter(l => 
          activeNodes.some(n => n.id === l.source) && activeNodes.some(n => n.id === l.target)
        );
      }

      // ──────────────────────────────────────────
      // 2. RUN PHYSICS SIMULATION (ONLY FOR ACTIVE NODES)
      // ──────────────────────────────────────────
      for (let i = 0; i < activeNodes.length; i++) {
        for (let j = i + 1; j < activeNodes.length; j++) {
          const n1 = activeNodes[i], n2 = activeNodes[j];
          const dx = n2.x - n1.x, dy = n2.y - n1.y;
          const distSq = dx * dx + dy * dy + 1;
          const dist = Math.sqrt(distSq);
          if (dist < 320) {
            const force = cfg.repelForce / distSq;
            const fx = (dx / dist) * force, fy = (dy / dist) * force;
            if (!drag || drag.id !== n1.id) { n1.vx -= fx; n1.vy -= fy; }
            if (!drag || drag.id !== n2.id) { n2.vx += fx; n2.vy += fy; }
          }
        }
      }

      activeLinks.forEach(link => {
        const sn = activeNodes.find(n => n.id === link.source);
        const tn = activeNodes.find(n => n.id === link.target);
        if (sn && tn) {
          const dx = tn.x - sn.x, dy = tn.y - sn.y;
          const dist = Math.sqrt(dx * dx + dy * dy) + 0.1;
          const force = (dist - cfg.linkDistance) * cfg.linkForce;
          const fx = (dx / dist) * force, fy = (dy / dist) * force;
          if (!drag || drag.id !== sn.id) { sn.vx += fx; sn.vy += fy; }
          if (!drag || drag.id !== tn.id) { tn.vx -= fx; tn.vy -= fy; }
        }
      });

      activeNodes.forEach(n => {
        if (drag && drag.id === n.id) { n.vx = 0; n.vy = 0; return; }
        n.vx *= cfg.damping;
        n.vy *= cfg.damping;
        n.vx -= n.x * cfg.centerForce;
        n.vy -= n.y * cfg.centerForce;
        n.x += n.vx;
        n.y += n.vy;

        // Rotated Brain containment
        if (cfg.showBrain) {
          const rxLimit = 95 * brainS;
          const ryLimit = 90 * brainS;
          const cy = 10 * brainS;

          const cosVal = Math.cos(-currentRotationAngle);
          const sinVal = Math.sin(-currentRotationAngle);
          const rNodeX = n.x * cosVal - n.y * sinVal;
          const rNodeY = n.x * sinVal + n.y * cosVal;

          const ex = (rNodeX * rNodeX) / (rxLimit * rxLimit) + ((rNodeY - cy) * (rNodeY - cy)) / (ryLimit * ryLimit);
          if (ex > 0.92) {
            const pushStrength = (ex - 0.92) * 0.3;
            const pushX = -rNodeX * pushStrength;
            const pushY = -(rNodeY - cy) * pushStrength;

            const cosPos = Math.cos(currentRotationAngle);
            const sinPos = Math.sin(currentRotationAngle);
            n.vx += pushX * cosPos - pushY * sinPos;
            n.vy += pushX * sinPos + pushY * cosPos;
          }
        }
      });

      // ──────────────────────────────────────────
      // 3. RENDER STAGE
      // ──────────────────────────────────────────
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Grid lines
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.012)';
      ctx.lineWidth = 1;
      const gs = 40;
      const ox = panRef.current.x % gs, oy = panRef.current.y % gs;
      for (let x = ox; x < canvas.width; x += gs) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke(); }
      for (let y = oy; y < canvas.height; y += gs) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke(); }
      ctx.restore();

      ctx.save();
      ctx.translate(canvas.width / 2 + panRef.current.x, canvas.height / 2 + panRef.current.y);
      ctx.scale(zoomRef.current, zoomRef.current);

      // Brain silhouette underlay
      if (cfg.showBrain) {
        draw3DBrain(ctx, brainRawSize, currentRotationAngle, cfg.brainOpacity);
      }

      // Clip inside brain
      if (cfg.showBrain) {
        ctx.save();
        ctx.rotate(currentRotationAngle);
        const clipPath = createBrainPath(brainS);
        ctx.clip(clipPath);
        ctx.rotate(-currentRotationAngle);
      }

      // ──── RENDER ACTIVE LINKS ────
      activeLinks.forEach(link => {
        const sn = activeNodes.find(n => n.id === link.source);
        const tn = activeNodes.find(n => n.id === link.target);
        if (!sn || !tn) return;

        const isHR = hoveredNodeRef.current &&
          (hoveredNodeRef.current.id === sn.id || hoveredNodeRef.current.id === tn.id);

        // Figure out if target matches any group (for line color matches)
        let linkColor = link.resolved ? cfg.lineColor : cfg.lineColorUnresolved;
        
        // Match source node to any group for gradient/color line highlights
        const matchingGroupSource = cfg.groups.find(g => {
          if (!g.query) return false;
          const q = g.query.toLowerCase();
          const vn = nodes.find(v => v.id === sn.id);
          if (q.startsWith('path:')) return vn?.parentId?.toLowerCase().includes(q.substring(5)) || false;
          if (q.startsWith('content:')) return vn?.content?.toLowerCase().includes(q.substring(8)) || false;
          return sn.name.toLowerCase().includes(q);
        });

        if (matchingGroupSource && link.resolved) {
          linkColor = matchingGroupSource.color;
        }

        ctx.beginPath();
        ctx.moveTo(sn.x, sn.y);
        ctx.lineTo(tn.x, tn.y);

        if (link.resolved) {
          ctx.strokeStyle = isHR ? hexToRgba(linkColor, 0.85) : hexToRgba(linkColor, 0.3);
          ctx.lineWidth = isHR ? cfg.lineThickness * 1.8 : cfg.lineThickness;
        } else {
          ctx.strokeStyle = isHR ? hexToRgba(cfg.lineColorUnresolved, 0.55) : hexToRgba(cfg.lineColorUnresolved, 0.15);
          ctx.lineWidth = cfg.lineThickness * 0.7;
          ctx.setLineDash([4, 4]);
        }
        ctx.stroke();
        ctx.setLineDash([]);

        // Nerve potential pulse
        if (link.resolved && cfg.showPulses) {
          const hash = Math.abs(sn.x * 12.3 + tn.y * 7.7);
          const speed = 0.0005 + (hash % 10) * 0.0001;
          const delay = (hash % 50) / 50;
          const t = (time * speed + delay) % 1.0;
          const px = sn.x + (tn.x - sn.x) * t;
          const py = sn.y + (tn.y - sn.y) * t;
          ctx.beginPath();
          ctx.arc(px, py, 2.0, 0, Math.PI * 2);
          ctx.fillStyle = isHR ? '#ffffff' : linkColor;
          ctx.shadowColor = linkColor;
          ctx.shadowBlur = 6;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });

      // ──── RENDER ACTIVE NODES ────
      activeNodes.forEach(node => {
        const isHov = hoveredNodeRef.current?.id === node.id;
        const breathe = Math.sin(time * 0.003 + node.x * 0.05) * 0.06;
        const scale = (1 + breathe + (isHov ? 0.3 : 0)) * cfg.nodeSize;
        const r = node.radius * scale;

        // Custom Group Color Check
        let nodeColor = node.resolved ? cfg.nodeColor : cfg.nodeColorUnresolved;
        const matchingGroup = cfg.groups.find(g => {
          if (!g.query) return false;
          const q = g.query.toLowerCase();
          const vn = nodes.find(v => v.id === node.id);
          if (q.startsWith('path:')) return vn?.parentId?.toLowerCase().includes(q.substring(5)) || false;
          if (q.startsWith('content:')) return vn?.content?.toLowerCase().includes(q.substring(8)) || false;
          return node.name.toLowerCase().includes(q);
        });

        if (matchingGroup && node.resolved) {
          nodeColor = matchingGroup.color;
        }

        // Glow aura
        ctx.beginPath();
        ctx.arc(node.x, node.y, r * (isHov ? 2.8 : 2.0), 0, Math.PI * 2);
        ctx.fillStyle = hexToRgba(nodeColor, isHov ? 0.35 : 0.12);
        ctx.shadowColor = nodeColor;
        ctx.shadowBlur = isHov ? 16 : 5;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Core dot
        ctx.beginPath();
        ctx.arc(node.x, node.y, r * 0.75, 0, Math.PI * 2);
        ctx.fillStyle = isHov ? '#ffffff' : nodeColor;
        ctx.fill();

        // Label
        if (cfg.showLabels && (zoomRef.current > 0.5 || isHov)) {
          ctx.fillStyle = isHov ? '#ffffff' : 'rgba(255,255,255,0.6)';
          const fs = isHov ? cfg.labelSize + 2 : cfg.labelSize;
          ctx.font = `${isHov ? 'bold ' : ''}${fs}px system-ui, -apple-system, sans-serif`;
          ctx.textAlign = 'center';
          if (isHov) { ctx.shadowColor = hexToRgba(nodeColor, 0.8); ctx.shadowBlur = 5; }
          ctx.fillText(node.name, node.x, node.y + r + 14);
          ctx.shadowBlur = 0;
        }
      });

      // Restore clip
      if (cfg.showBrain) {
        ctx.restore();
      }

      // Glass shine overlay
      if (cfg.showBrain) {
        ctx.save();
        ctx.rotate(currentRotationAngle);
        const overlayPath = createBrainPath(brainS);
        ctx.clip(overlayPath);

        const sweepGrad = ctx.createLinearGradient(0, -95 * brainS, 0, 20 * brainS);
        sweepGrad.addColorStop(0, `rgba(255, 255, 255, ${0.04 * cfg.brainOpacity})`);
        sweepGrad.addColorStop(0.3, `rgba(255, 255, 255, ${0.015 * cfg.brainOpacity})`);
        sweepGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = sweepGrad;
        ctx.fillRect(-110 * brainS, -100 * brainS, 220 * brainS, 230 * brainS);

        ctx.restore();
      }

      ctx.restore();
      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(animId); ro.disconnect(); };
  }, [nodes]);

  // Wheel zoom
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const h = (e: WheelEvent) => {
      e.preventDefault();
      const f = 1.08;
      const nz = e.deltaY < 0 ? zoomRef.current * f : zoomRef.current / f;
      zoomRef.current = Math.max(0.15, Math.min(nz, 5));
    };
    c.addEventListener('wheel', h, { passive: false });
    return () => c.removeEventListener('wheel', h);
  }, []);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e.clientX, e.clientY);
    const clicked = nodesRef.current.find(n => {
      // Find if we clicked on a visible/active node
      const vn = nodes.find(v => v.id === n.id);
      const q = settings.searchQuery.toLowerCase();
      // Apply exact same filters as activeNodes
      if (!settings.showUnresolved && !n.resolved) return false;
      if (settings.searchQuery) {
        const nameMatch = n.name.toLowerCase().includes(q);
        const contentMatch = vn?.content?.toLowerCase().includes(q) || false;
        const pathMatch = vn?.parentId?.toLowerCase().includes(q) || false;
        if (!nameMatch && !contentMatch && !pathMatch) return false;
      }
      // Calculate click distance
      return Math.sqrt((n.x - coords.x) ** 2 + (n.y - coords.y) ** 2) <= n.radius + 6;
    });

    if (clicked) {
      draggedNodeRef.current = clicked;
      dragStart.current = { x: coords.x - clicked.x, y: coords.y - clicked.y };
    } else {
      isPanning.current = true;
      panStart.current = { x: e.clientX - panRef.current.x, y: e.clientY - panRef.current.y };
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e.clientX, e.clientY);
    const drag = draggedNodeRef.current;
    if (drag) {
      drag.x = coords.x - dragStart.current.x;
      drag.y = coords.y - dragStart.current.y;
    } else if (isPanning.current) {
      panRef.current = { x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y };
    } else {
      const hov = nodesRef.current.find(n => {
        const vn = nodes.find(v => v.id === n.id);
        const q = settings.searchQuery.toLowerCase();
        if (!settings.showUnresolved && !n.resolved) return false;
        if (settings.searchQuery) {
          const nameMatch = n.name.toLowerCase().includes(q);
          const contentMatch = vn?.content?.toLowerCase().includes(q) || false;
          const pathMatch = vn?.parentId?.toLowerCase().includes(q) || false;
          if (!nameMatch && !contentMatch && !pathMatch) return false;
        }
        return Math.sqrt((n.x - coords.x) ** 2 + (n.y - coords.y) ** 2) <= n.radius + 6;
      });
      hoveredNodeRef.current = hov || null;
      setHoveredNodeName(hov ? hov.name : null);
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const drag = draggedNodeRef.current;
    if (drag) {
      const c = getCanvasCoords(e.clientX, e.clientY);
      if (Math.sqrt((c.x - drag.x) ** 2 + (c.y - drag.y) ** 2) < 4 && drag.resolved) {
        openFileInTab(drag.id); onClose();
      }
      draggedNodeRef.current = null;
    }
    isPanning.current = false;
  };

  const handleZoom = (f: number) => { zoomRef.current = Math.max(0.15, Math.min(zoomRef.current * f, 5)); };

  const handleReset = () => {
    zoomRef.current = 1;
    panRef.current = { x: 0, y: 0 };
    nodesRef.current.forEach(n => { n.vx = (Math.random() - 0.5) * 16; n.vy = (Math.random() - 0.5) * 16; });
  };

  return (
    <div className="graph-container fade-in">
      <div className="pane-header">
        <span className="pane-path">
          {hoveredNodeName ? `Conexão: ${hoveredNodeName}` : 'Rede Sináptica — Mapa Neural'}
        </span>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <button className={`icon-btn ${showSettings ? 'active' : ''}`} onClick={() => setShowSettings(!showSettings)} title="Configurações do Grafo">
            <Settings size={16} />
          </button>
          <button className="icon-btn" onClick={onClose} title="Fechar Grafo">
            <X size={16} />
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
        <canvas
          ref={canvasRef}
          className="graph-canvas"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        />

        {showSettings && (
          <div className="graph-settings-panel">
            <div className="graph-settings-scroll">
              
              {/* ── FILTROS (Filters) ── */}
              <div className="graph-settings-section">
                <h4 className="graph-settings-section-title">Filtros</h4>
                
                <input
                  type="text"
                  className="graph-search-input"
                  placeholder="Pesquisar notas..."
                  value={settings.searchQuery}
                  onChange={e => updateSetting('searchQuery', e.target.value)}
                />

                <label className="graph-settings-row graph-settings-toggle">
                  <span>Arquivos órfãos</span>
                  <input type="checkbox" checked={settings.showOrphans} onChange={e => updateSetting('showOrphans', e.target.checked)} />
                  <span className="graph-toggle-track"><span className="graph-toggle-thumb" /></span>
                </label>

                <label className="graph-settings-row graph-settings-toggle">
                  <span>Não existentes / Não resolvidos</span>
                  <input type="checkbox" checked={settings.showUnresolved} onChange={e => updateSetting('showUnresolved', e.target.checked)} />
                  <span className="graph-toggle-track"><span className="graph-toggle-thumb" /></span>
                </label>
              </div>

              {/* ── GRUPOS (Groups) ── */}
              <div className="graph-settings-section">
                <h4 className="graph-settings-section-title">Grupos de Cores</h4>
                
                {settings.groups.map((group, index) => (
                  <div key={index} className="graph-group-item">
                    <input
                      type="color"
                      className="graph-group-color"
                      value={group.color}
                      onChange={e => updateGroup(index, 'color', e.target.value)}
                      title="Escolher cor para o grupo"
                    />
                    <input
                      type="text"
                      className="graph-group-input"
                      placeholder="Filtro (ex: path:projects ou welcome)"
                      value={group.query}
                      onChange={e => updateGroup(index, 'query', e.target.value)}
                    />
                    <button 
                      className="icon-btn text-danger-hover" 
                      onClick={() => removeGroup(index)}
                      title="Remover grupo"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}

                <button className="graph-group-add-btn" onClick={addGroup}>
                  <Plus size={12} /> Novo Grupo
                </button>
              </div>

              {/* ── Aparência ── */}
              <div className="graph-settings-section">
                <h4 className="graph-settings-section-title">Aparência</h4>

                <label className="graph-settings-row">
                  <span>Cor do nó</span>
                  <input type="color" value={settings.nodeColor} onChange={e => updateSetting('nodeColor', e.target.value)} />
                </label>
                <label className="graph-settings-row">
                  <span>Cor nó (não resolvido)</span>
                  <input type="color" value={settings.nodeColorUnresolved} onChange={e => updateSetting('nodeColorUnresolved', e.target.value)} />
                </label>
                <label className="graph-settings-row">
                  <span>Cor da linha</span>
                  <input type="color" value={settings.lineColor} onChange={e => updateSetting('lineColor', e.target.value)} />
                </label>
                <label className="graph-settings-row">
                  <span>Cor linha (não resolvida)</span>
                  <input type="color" value={settings.lineColorUnresolved} onChange={e => updateSetting('lineColorUnresolved', e.target.value)} />
                </label>
                <label className="graph-settings-row">
                  <span>Espessura da linha</span>
                  <input type="range" min="0.3" max="4" step="0.1" value={settings.lineThickness} onChange={e => updateSetting('lineThickness', parseFloat(e.target.value))} />
                  <span className="graph-settings-value">{settings.lineThickness.toFixed(1)}</span>
                </label>
                <label className="graph-settings-row">
                  <span>Tamanho do nó</span>
                  <input type="range" min="0.3" max="3" step="0.1" value={settings.nodeSize} onChange={e => updateSetting('nodeSize', parseFloat(e.target.value))} />
                  <span className="graph-settings-value">{settings.nodeSize.toFixed(1)}</span>
                </label>
                <label className="graph-settings-row">
                  <span>Tamanho do rótulo</span>
                  <input type="range" min="6" max="18" step="1" value={settings.labelSize} onChange={e => updateSetting('labelSize', parseInt(e.target.value))} />
                  <span className="graph-settings-value">{settings.labelSize}px</span>
                </label>
              </div>

              {/* ── Cérebro 3D ── */}
              <div className="graph-settings-section">
                <h4 className="graph-settings-section-title"><Brain size={11} style={{ marginRight: 4, verticalAlign: -2 }} />Cérebro 3D</h4>

                <label className="graph-settings-row graph-settings-toggle">
                  <span>Mostrar cérebro</span>
                  <input type="checkbox" checked={settings.showBrain} onChange={e => updateSetting('showBrain', e.target.checked)} />
                  <span className="graph-toggle-track"><span className="graph-toggle-thumb" /></span>
                </label>
                <label className="graph-settings-row">
                  <span>Tamanho do cérebro</span>
                  <input type="range" min="0.3" max="5.0" step="0.1" value={settings.brainSize} onChange={e => updateSetting('brainSize', parseFloat(e.target.value))} />
                  <span className="graph-settings-value">{(settings.brainSize * 100).toFixed(0)}%</span>
                </label>
                <label className="graph-settings-row">
                  <span>Opacidade do cérebro</span>
                  <input type="range" min="0.0" max="1.0" step="0.05" value={settings.brainOpacity} onChange={e => updateSetting('brainOpacity', parseFloat(e.target.value))} />
                  <span className="graph-settings-value">{(settings.brainOpacity * 100).toFixed(0)}%</span>
                </label>
                <label className="graph-settings-row">
                  <span>Ângulo de rotação</span>
                  <input type="range" min="0" max="360" step="5" value={settings.brainRotation} onChange={e => updateSetting('brainRotation', parseInt(e.target.value))} />
                  <span className="graph-settings-value">{settings.brainRotation}°</span>
                </label>
                <label className="graph-settings-row">
                  <span>Auto-rotação</span>
                  <input type="range" min="0" max="5" step="0.5" value={settings.brainRotationSpeed} onChange={e => updateSetting('brainRotationSpeed', parseFloat(e.target.value))} />
                  <span className="graph-settings-value">{settings.brainRotationSpeed.toFixed(1)}x</span>
                </label>
              </div>

              {/* ── Exibição ── */}
              <div className="graph-settings-section">
                <h4 className="graph-settings-section-title">Exibição</h4>
                <label className="graph-settings-row graph-settings-toggle">
                  <span>Mostrar rótulos</span>
                  <input type="checkbox" checked={settings.showLabels} onChange={e => updateSetting('showLabels', e.target.checked)} />
                  <span className="graph-toggle-track"><span className="graph-toggle-thumb" /></span>
                </label>
                <label className="graph-settings-row graph-settings-toggle">
                  <span>Pulsos de sinal</span>
                  <input type="checkbox" checked={settings.showPulses} onChange={e => updateSetting('showPulses', e.target.checked)} />
                  <span className="graph-toggle-track"><span className="graph-toggle-thumb" /></span>
                </label>
              </div>

              {/* ── Forças ── */}
              <div className="graph-settings-section">
                <h4 className="graph-settings-section-title">Forças</h4>
                <label className="graph-settings-row">
                  <span>Repulsão</span>
                  <input type="range" min="20" max="500" step="10" value={settings.repelForce} onChange={e => updateSetting('repelForce', parseInt(e.target.value))} />
                  <span className="graph-settings-value">{settings.repelForce}</span>
                </label>
                <label className="graph-settings-row">
                  <span>Atração dos links</span>
                  <input type="range" min="0.005" max="0.15" step="0.005" value={settings.linkForce} onChange={e => updateSetting('linkForce', parseFloat(e.target.value))} />
                  <span className="graph-settings-value">{settings.linkForce.toFixed(3)}</span>
                </label>
                <label className="graph-settings-row">
                  <span>Gravidade central</span>
                  <input type="range" min="0" max="0.06" step="0.002" value={settings.centerForce} onChange={e => updateSetting('centerForce', parseFloat(e.target.value))} />
                  <span className="graph-settings-value">{settings.centerForce.toFixed(3)}</span>
                </label>
                <label className="graph-settings-row">
                  <span>Distância dos links</span>
                  <input type="range" min="30" max="300" step="5" value={settings.linkDistance} onChange={e => updateSetting('linkDistance', parseInt(e.target.value))} />
                  <span className="graph-settings-value">{settings.linkDistance}</span>
                </label>
                <label className="graph-settings-row">
                  <span>Amortecimento</span>
                  <input type="range" min="0.5" max="0.98" step="0.02" value={settings.damping} onChange={e => updateSetting('damping', parseFloat(e.target.value))} />
                  <span className="graph-settings-value">{settings.damping.toFixed(2)}</span>
                </label>
              </div>

              <button className="graph-settings-reset" onClick={() => setSettings({ ...DEFAULT_SETTINGS })}>
                Restaurar Padrões
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="graph-controls">
        <button className="icon-btn" onClick={() => handleZoom(1.25)} title="Aumentar Zoom"><ZoomIn size={16} /></button>
        <button className="icon-btn" onClick={() => handleZoom(0.8)} title="Diminuir Zoom"><ZoomOut size={16} /></button>
        <button className="icon-btn" onClick={handleReset} title="Repulsionar / Resetar"><RefreshCw size={16} /></button>
      </div>
    </div>
  );
};
