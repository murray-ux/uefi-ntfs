// L4-manifold/playroom.ts
//
// ROOM: PLAYROOM — Kids Finger Painting & Creative Play
//
// A recreational module providing an interactive finger painting
// canvas for children. Supports touch input, vibrant colors,
// brush sizes, and canvas management. Designed for tablets and
// touch-enabled devices.
//
// Lives in L4 because it extends the platform with creative
// capabilities beyond core security functions.
//
// Copyright (c) 2025 MuzzL3d Dictionary Contributors — Apache-2.0

import { Kernel, Timestamp } from "../layer0-kernel";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Color {
  name: string;
  hex: string;
  rgb: { r: number; g: number; b: number };
}

export interface BrushSpec {
  size: number;       // pixels
  opacity: number;    // 0-1
  type: "round" | "square" | "spray";
}

export interface Stroke {
  id: string;
  color: Color;
  brush: BrushSpec;
  points: Array<{ x: number; y: number; pressure?: number }>;
  timestamp: Timestamp;
}

export interface Artwork {
  readonly id: string;
  readonly createdAt: Timestamp;
  readonly artistName: string;
  title: string;
  strokes: Stroke[];
  width: number;
  height: number;
  backgroundColor: string;
}

export interface PlayroomSession {
  readonly id: string;
  readonly startedAt: Timestamp;
  endedAt: Timestamp | null;
  artworks: Artwork[];
  activeArtwork: string | null;
}

export interface PlayroomStats {
  totalSessions: number;
  totalArtworks: number;
  totalStrokes: number;
  favoriteColor: string | null;
  averageSessionDurationMs: number;
}

// ---------------------------------------------------------------------------
// Default Colors — Kid-Friendly Palette
// ---------------------------------------------------------------------------

export const FINGER_PAINT_COLORS: Color[] = [
  { name: "Cherry Red", hex: "#FF6B6B", rgb: { r: 255, g: 107, b: 107 } },
  { name: "Sunset Orange", hex: "#FFA94D", rgb: { r: 255, g: 169, b: 77 } },
  { name: "Sunshine Yellow", hex: "#FFE066", rgb: { r: 255, g: 224, b: 102 } },
  { name: "Grass Green", hex: "#69DB7C", rgb: { r: 105, g: 219, b: 124 } },
  { name: "Sky Blue", hex: "#74C0FC", rgb: { r: 116, g: 192, b: 252 } },
  { name: "Grape Purple", hex: "#B197FC", rgb: { r: 177, g: 151, b: 252 } },
  { name: "Bubblegum Pink", hex: "#F783AC", rgb: { r: 247, g: 131, b: 172 } },
  { name: "Chocolate Brown", hex: "#A67C52", rgb: { r: 166, g: 124, b: 82 } },
  { name: "Storm Cloud", hex: "#868E96", rgb: { r: 134, g: 142, b: 150 } },
  { name: "Midnight Black", hex: "#212529", rgb: { r: 33, g: 37, b: 41 } },
  { name: "Snow White", hex: "#F8F9FA", rgb: { r: 248, g: 249, b: 250 } },
  { name: "Ocean Teal", hex: "#38D9A9", rgb: { r: 56, g: 217, b: 169 } },
];

// ---------------------------------------------------------------------------
// Playroom Class
// ---------------------------------------------------------------------------

export class Playroom {
  private readonly kernel: Kernel;
  private readonly sessions = new Map<string, PlayroomSession>();
  private readonly artworkIndex = new Map<string, Artwork>();
  private colorUsage = new Map<string, number>();
  private currentSessionId: string | null = null;

  constructor(kernel: Kernel) {
    this.kernel = kernel;
  }

  // ── Session Management ───────────────────────────────────────────────────

  startSession(artistName: string = "Little Artist"): PlayroomSession {
    const id = this.kernel.deriveId("playroom", "session", Date.now().toString());
    const session: PlayroomSession = {
      id,
      startedAt: this.kernel.now(),
      endedAt: null,
      artworks: [],
      activeArtwork: null,
    };

    this.sessions.set(id, session);
    this.currentSessionId = id;

    // Auto-create first canvas
    this.newCanvas(artistName, "My Masterpiece");

    return session;
  }

  endSession(sessionId?: string): PlayroomSession | null {
    const id = sessionId ?? this.currentSessionId;
    if (!id) return null;

    const session = this.sessions.get(id);
    if (!session) return null;

    session.endedAt = this.kernel.now();
    if (this.currentSessionId === id) {
      this.currentSessionId = null;
    }

    return session;
  }

  getSession(sessionId?: string): PlayroomSession | null {
    const id = sessionId ?? this.currentSessionId;
    return id ? this.sessions.get(id) ?? null : null;
  }

  // ── Canvas Management ────────────────────────────────────────────────────

  newCanvas(
    artistName: string = "Little Artist",
    title: string = "Untitled",
    width: number = 800,
    height: number = 600,
    backgroundColor: string = "#FFFFFF"
  ): Artwork | null {
    const session = this.getSession();
    if (!session) return null;

    const artwork: Artwork = {
      id: this.kernel.deriveId("playroom", "art", Date.now().toString()),
      createdAt: this.kernel.now(),
      artistName,
      title,
      strokes: [],
      width,
      height,
      backgroundColor,
    };

    session.artworks.push(artwork);
    session.activeArtwork = artwork.id;
    this.artworkIndex.set(artwork.id, artwork);

    return artwork;
  }

  getActiveArtwork(): Artwork | null {
    const session = this.getSession();
    if (!session?.activeArtwork) return null;
    return this.artworkIndex.get(session.activeArtwork) ?? null;
  }

  setActiveArtwork(artworkId: string): boolean {
    const session = this.getSession();
    if (!session) return false;

    if (this.artworkIndex.has(artworkId)) {
      session.activeArtwork = artworkId;
      return true;
    }
    return false;
  }

  clearCanvas(artworkId?: string): boolean {
    const artwork = artworkId
      ? this.artworkIndex.get(artworkId)
      : this.getActiveArtwork();
    if (!artwork) return false;

    artwork.strokes = [];
    return true;
  }

  // ── Drawing ──────────────────────────────────────────────────────────────

  beginStroke(
    color: Color,
    brush: BrushSpec,
    startPoint: { x: number; y: number; pressure?: number }
  ): Stroke | null {
    const artwork = this.getActiveArtwork();
    if (!artwork) return null;

    const stroke: Stroke = {
      id: this.kernel.deriveId("playroom", "stroke", Date.now().toString()),
      color,
      brush,
      points: [startPoint],
      timestamp: this.kernel.now(),
    };

    artwork.strokes.push(stroke);

    // Track color usage for stats
    const count = this.colorUsage.get(color.name) ?? 0;
    this.colorUsage.set(color.name, count + 1);

    return stroke;
  }

  addPoint(
    strokeId: string,
    point: { x: number; y: number; pressure?: number }
  ): boolean {
    const artwork = this.getActiveArtwork();
    if (!artwork) return false;

    const stroke = artwork.strokes.find((s) => s.id === strokeId);
    if (!stroke) return false;

    stroke.points.push(point);
    return true;
  }

  undoLastStroke(): Stroke | null {
    const artwork = this.getActiveArtwork();
    if (!artwork || artwork.strokes.length === 0) return null;

    return artwork.strokes.pop() ?? null;
  }

  // ── Colors & Brushes ─────────────────────────────────────────────────────

  getColors(): Color[] {
    return [...FINGER_PAINT_COLORS];
  }

  getColorByName(name: string): Color | null {
    return FINGER_PAINT_COLORS.find((c) => c.name === name) ?? null;
  }

  createCustomColor(name: string, hex: string): Color {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { name, hex, rgb: { r, g, b } };
  }

  getDefaultBrushes(): BrushSpec[] {
    return [
      { size: 8, opacity: 1, type: "round" },   // Fine
      { size: 20, opacity: 1, type: "round" },  // Medium
      { size: 40, opacity: 1, type: "round" },  // Thick
      { size: 60, opacity: 0.3, type: "spray" }, // Spray
      { size: 30, opacity: 1, type: "square" }, // Square
    ];
  }

  // ── Export ───────────────────────────────────────────────────────────────

  exportArtworkData(artworkId?: string): object | null {
    const artwork = artworkId
      ? this.artworkIndex.get(artworkId)
      : this.getActiveArtwork();
    if (!artwork) return null;

    return {
      id: artwork.id,
      title: artwork.title,
      artistName: artwork.artistName,
      createdAt: artwork.createdAt,
      dimensions: { width: artwork.width, height: artwork.height },
      backgroundColor: artwork.backgroundColor,
      strokeCount: artwork.strokes.length,
      strokes: artwork.strokes.map((s) => ({
        color: s.color.hex,
        brushSize: s.brush.size,
        brushType: s.brush.type,
        pointCount: s.points.length,
      })),
    };
  }

  // ── Stats ────────────────────────────────────────────────────────────────

  stats(): PlayroomStats {
    let totalStrokes = 0;
    let totalDuration = 0;
    let sessionCount = 0;

    for (const session of this.sessions.values()) {
      for (const artwork of session.artworks) {
        totalStrokes += artwork.strokes.length;
      }

      if (session.endedAt) {
        totalDuration +=
          Number(session.endedAt.monotonic - session.startedAt.monotonic) / 1e6;
        sessionCount++;
      }
    }

    // Find favorite color
    let favoriteColor: string | null = null;
    let maxUsage = 0;
    for (const [color, usage] of this.colorUsage) {
      if (usage > maxUsage) {
        maxUsage = usage;
        favoriteColor = color;
      }
    }

    return {
      totalSessions: this.sessions.size,
      totalArtworks: this.artworkIndex.size,
      totalStrokes,
      favoriteColor,
      averageSessionDurationMs: sessionCount > 0 ? totalDuration / sessionCount : 0,
    };
  }

  // ── Knight Dialer Easter Egg ─────────────────────────────────────────────
  // Hidden mini-game: Draw the path of a knight on a phone keypad!

  knightDialer(n: number): number {
    const MOD = 10 ** 9 + 7;
    if (n === 1) return 10;

    // Possible moves for each digit (phone keypad knight moves)
    const moves: number[][] = [
      [4, 6],     // 0
      [6, 8],     // 1
      [7, 9],     // 2
      [4, 8],     // 3
      [0, 3, 9],  // 4
      [],         // 5 (no moves)
      [0, 1, 7],  // 6
      [2, 6],     // 7
      [1, 3],     // 8
      [2, 4],     // 9
    ];

    let counts = new Array(10).fill(1);

    for (let i = 0; i < n - 1; i++) {
      const newCounts = new Array(10).fill(0);
      for (let digit = 0; digit < 10; digit++) {
        for (const nextDigit of moves[digit]) {
          newCounts[nextDigit] = (newCounts[nextDigit] + counts[digit]) % MOD;
        }
      }
      counts = newCounts;
    }

    return counts.reduce((sum, c) => (sum + c) % MOD, 0);
  }

  // ── Render Instructions (for client) ─────────────────────────────────────

  getRenderInstructions(): object {
    return {
      canvasSelector: "#playroom-canvas",
      colors: this.getColors(),
      brushes: this.getDefaultBrushes(),
      touchEnabled: true,
      multiTouch: false,
      backgroundColor: "#FFFFFF",
      instructions: [
        "Touch or click and drag to paint!",
        "Pick colors from the palette below",
        "Use different brush sizes for variety",
        "Tap 'Clear' to start over",
        "Have fun creating!",
      ],
    };
  }
}
