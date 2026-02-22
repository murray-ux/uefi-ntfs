/**
 * LAYER 4: ASSET & ANIMATION
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Copyright 2025 murray-ux
 * SPDX-License-Identifier: Apache-2.0
 *
 * Master Generation Skeleton Ecosystem - Textures, rigs, animation sequences
 *
 * Asset Types:
 *   - Textures: Procedural noise (Worley, Perlin), color grading
 *   - Rigs: Auto-rig from skeleton (IK chains, control rigs)
 *   - Animations: Keyframe interpolation, motion blending, physics
 *   - Audio: Procedural sound effects
 *
 * GENESIS 2.0 — Forbidden Ninja City
 *
 * @module LAYER_4_ASSETS_ANIM
 * @author murray-ux <Founder & Lead Developer>
 * @version 1.0.0
 * @license Apache-2.0
 */

import { EventEmitter } from 'events';

// ══════════════════════════════════════════════════════════════════════════════
// COLOR UTILITIES
// ══════════════════════════════════════════════════════════════════════════════

const Color = {
  rgb: (r, g, b, a = 1) => ({ r, g, b, a }),

  fromHSL: (h, s, l, a = 1) => {
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;
    let r, g, b;

    if (h < 60) { r = c; g = x; b = 0; }
    else if (h < 120) { r = x; g = c; b = 0; }
    else if (h < 180) { r = 0; g = c; b = x; }
    else if (h < 240) { r = 0; g = x; b = c; }
    else if (h < 300) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }

    return { r: r + m, g: g + m, b: b + m, a };
  },

  lerp: (a, b, t) => ({
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
    a: a.a + (b.a - a.a) * t
  }),

  toHex: (c) => {
    const r = Math.round(c.r * 255).toString(16).padStart(2, '0');
    const g = Math.round(c.g * 255).toString(16).padStart(2, '0');
    const b = Math.round(c.b * 255).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// PROCEDURAL TEXTURES
// ══════════════════════════════════════════════════════════════════════════════

class WorleyNoise {
  constructor(prng, cellCount = 16) {
    this.prng = prng;
    this.cellCount = cellCount;
    this.points = [];
    this._generatePoints();
  }

  _generatePoints() {
    for (let i = 0; i < this.cellCount * this.cellCount; i++) {
      this.points.push({
        x: this.prng.next(),
        y: this.prng.next()
      });
    }
  }

  sample(x, y, n = 1) {
    // Wrap coordinates
    x = x - Math.floor(x);
    y = y - Math.floor(y);

    // Find n nearest points
    const distances = this.points.map(p => {
      let dx = Math.abs(x - p.x);
      let dy = Math.abs(y - p.y);
      // Wrap around
      dx = Math.min(dx, 1 - dx);
      dy = Math.min(dy, 1 - dy);
      return Math.sqrt(dx * dx + dy * dy);
    }).sort((a, b) => a - b);

    return distances[n - 1] || distances[0];
  }
}

class ProceduralTexture {
  constructor(width, height, prng) {
    this.width = width;
    this.height = height;
    this.prng = prng;
    this.data = new Uint8ClampedArray(width * height * 4);
  }

  setPixel(x, y, color) {
    const idx = (y * this.width + x) * 4;
    this.data[idx] = Math.round(color.r * 255);
    this.data[idx + 1] = Math.round(color.g * 255);
    this.data[idx + 2] = Math.round(color.b * 255);
    this.data[idx + 3] = Math.round(color.a * 255);
  }

  getPixel(x, y) {
    const idx = (y * this.width + x) * 4;
    return {
      r: this.data[idx] / 255,
      g: this.data[idx + 1] / 255,
      b: this.data[idx + 2] / 255,
      a: this.data[idx + 3] / 255
    };
  }

  fill(generator) {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const u = x / this.width;
        const v = y / this.height;
        const color = generator(u, v, x, y);
        this.setPixel(x, y, color);
      }
    }
    return this;
  }

  toDataURL() {
    // Base64 encode for export (simplified - would use canvas in browser)
    return `data:image/raw;base64,${Buffer.from(this.data).toString('base64')}`;
  }

  toJSON() {
    return {
      width: this.width,
      height: this.height,
      data: Array.from(this.data)
    };
  }
}

class TextureGenerator {
  constructor(prng, config = {}) {
    this.prng = prng;
    this.config = {
      resolution: config.resolution || 512,
      ...config
    };
  }

  generateNoise(type = 'perlin') {
    const texture = new ProceduralTexture(
      this.config.resolution,
      this.config.resolution,
      this.prng
    );

    const worley = new WorleyNoise(this.prng.derive('worley'));

    texture.fill((u, v) => {
      let value;

      switch (type) {
        case 'worley':
          value = worley.sample(u * 4, v * 4);
          break;
        case 'cellular':
          value = 1 - worley.sample(u * 8, v * 8);
          break;
        case 'perlin':
        default:
          // Simple noise approximation
          value = (Math.sin(u * 20) + Math.sin(v * 20) + this.prng.next()) / 3;
          value = (value + 1) / 2;
      }

      return Color.rgb(value, value, value);
    });

    return texture;
  }

  generateOrganic(baseColor, variationColor) {
    const texture = new ProceduralTexture(
      this.config.resolution,
      this.config.resolution,
      this.prng
    );

    const worley = new WorleyNoise(this.prng.derive('organic'), 8);

    texture.fill((u, v) => {
      const n1 = worley.sample(u * 4, v * 4);
      const n2 = worley.sample(u * 8, v * 8, 2);

      const t = (n1 + n2) / 2;
      return Color.lerp(baseColor, variationColor, t);
    });

    return texture;
  }

  generateNormalMap(heightTexture) {
    const texture = new ProceduralTexture(
      heightTexture.width,
      heightTexture.height,
      this.prng
    );

    const strength = 2.0;

    for (let y = 1; y < heightTexture.height - 1; y++) {
      for (let x = 1; x < heightTexture.width - 1; x++) {
        const left = heightTexture.getPixel(x - 1, y).r;
        const right = heightTexture.getPixel(x + 1, y).r;
        const up = heightTexture.getPixel(x, y - 1).r;
        const down = heightTexture.getPixel(x, y + 1).r;

        const dx = (left - right) * strength;
        const dy = (up - down) * strength;

        // Convert to normal
        const len = Math.sqrt(dx * dx + dy * dy + 1);
        const nx = dx / len * 0.5 + 0.5;
        const ny = dy / len * 0.5 + 0.5;
        const nz = 1 / len * 0.5 + 0.5;

        texture.setPixel(x, y, Color.rgb(nx, ny, nz));
      }
    }

    return texture;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// ANIMATION SYSTEM
// ══════════════════════════════════════════════════════════════════════════════

class Keyframe {
  constructor(time, value, easing = 'linear') {
    this.time = time;
    this.value = value;
    this.easing = easing;
  }
}

class AnimationTrack {
  constructor(targetId, property) {
    this.targetId = targetId;
    this.property = property;
    this.keyframes = [];
  }

  addKeyframe(time, value, easing = 'linear') {
    this.keyframes.push(new Keyframe(time, value, easing));
    this.keyframes.sort((a, b) => a.time - b.time);
    return this;
  }

  evaluate(time) {
    if (this.keyframes.length === 0) return null;
    if (this.keyframes.length === 1) return this.keyframes[0].value;

    // Find surrounding keyframes
    let prev = this.keyframes[0];
    let next = this.keyframes[this.keyframes.length - 1];

    for (let i = 0; i < this.keyframes.length - 1; i++) {
      if (time >= this.keyframes[i].time && time <= this.keyframes[i + 1].time) {
        prev = this.keyframes[i];
        next = this.keyframes[i + 1];
        break;
      }
    }

    // Interpolate
    const t = (time - prev.time) / (next.time - prev.time);
    return this._interpolate(prev.value, next.value, this._ease(t, next.easing));
  }

  _ease(t, type) {
    switch (type) {
      case 'easeIn': return t * t;
      case 'easeOut': return 1 - (1 - t) * (1 - t);
      case 'easeInOut': return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      case 'linear':
      default: return t;
    }
  }

  _interpolate(a, b, t) {
    if (typeof a === 'number') {
      return a + (b - a) * t;
    }
    if (typeof a === 'object') {
      const result = {};
      for (const key in a) {
        result[key] = this._interpolate(a[key], b[key], t);
      }
      return result;
    }
    return t < 0.5 ? a : b;
  }

  toJSON() {
    return {
      targetId: this.targetId,
      property: this.property,
      keyframes: this.keyframes.map(k => ({
        time: k.time,
        value: k.value,
        easing: k.easing
      }))
    };
  }
}

class AnimationClip {
  constructor(name, duration = 1.0) {
    this.name = name;
    this.duration = duration;
    this.tracks = [];
    this.loop = true;
    this.speed = 1.0;
  }

  addTrack(track) {
    this.tracks.push(track);
    return this;
  }

  createTrack(targetId, property) {
    const track = new AnimationTrack(targetId, property);
    this.tracks.push(track);
    return track;
  }

  evaluate(time) {
    if (this.loop) {
      time = time % this.duration;
    }
    time = Math.max(0, Math.min(this.duration, time));

    const values = {};
    for (const track of this.tracks) {
      if (!values[track.targetId]) {
        values[track.targetId] = {};
      }
      values[track.targetId][track.property] = track.evaluate(time);
    }
    return values;
  }

  toJSON() {
    return {
      name: this.name,
      duration: this.duration,
      loop: this.loop,
      speed: this.speed,
      tracks: this.tracks.map(t => t.toJSON())
    };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// AUTO-RIGGER
// ══════════════════════════════════════════════════════════════════════════════

class IKChain {
  constructor(name, joints) {
    this.name = name;
    this.joints = joints; // Joint IDs from root to end
    this.target = null;
    this.poleVector = null;
    this.iterations = 10;
  }

  toJSON() {
    return {
      name: this.name,
      joints: this.joints,
      target: this.target,
      poleVector: this.poleVector
    };
  }
}

class ControlRig {
  constructor() {
    this.ikChains = [];
    this.fkControls = [];
    this.constraints = [];
  }

  addIKChain(chain) {
    this.ikChains.push(chain);
    return this;
  }

  addFKControl(jointId, options = {}) {
    this.fkControls.push({
      jointId,
      shape: options.shape || 'circle',
      size: options.size || 1,
      color: options.color || { r: 1, g: 1, b: 0 }
    });
    return this;
  }

  addConstraint(type, sourceId, targetId, params = {}) {
    this.constraints.push({ type, sourceId, targetId, params });
    return this;
  }

  toJSON() {
    return {
      ikChains: this.ikChains.map(c => c.toJSON()),
      fkControls: this.fkControls,
      constraints: this.constraints
    };
  }
}

class AutoRigger {
  constructor(skeleton, prng) {
    this.skeleton = skeleton;
    this.prng = prng;
    this.rig = new ControlRig();
  }

  generateRig() {
    const joints = this.skeleton.joints || [];

    // Find root
    const root = joints.find(j => j.parentId === null);
    if (!root) return this.rig;

    // Add FK controls for all joints
    for (const joint of joints) {
      this.rig.addFKControl(joint.id, {
        shape: joint.boneType === 'spine' ? 'box' : 'circle',
        size: joint.influenceRadius || 1
      });
    }

    // Detect and create IK chains for limbs
    const limbs = this._detectLimbs(joints);
    for (const limb of limbs) {
      const chain = new IKChain(`ik_${limb.name}`, limb.joints);
      this.rig.addIKChain(chain);
    }

    return this.rig;
  }

  _detectLimbs(joints) {
    const limbs = [];

    // Find chains of 3+ joints ending in extremities
    for (const joint of joints) {
      if (joint.boneType === 'extremity' && joint.childrenIds.length === 0) {
        const chain = this._traceToSpine(joint, joints);
        if (chain.length >= 3) {
          limbs.push({
            name: `limb_${joint.id}`,
            joints: chain.reverse().map(j => j.id)
          });
        }
      }
    }

    return limbs;
  }

  _traceToSpine(joint, joints) {
    const chain = [joint];
    let current = joints.find(j => j.id === joint.parentId);

    while (current && current.boneType !== 'spine' && current.boneType !== 'root') {
      chain.push(current);
      current = joints.find(j => j.id === current.parentId);
    }

    return chain;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// ANIMATION GENERATOR
// ══════════════════════════════════════════════════════════════════════════════

class AnimationGenerator {
  constructor(skeleton, prng) {
    this.skeleton = skeleton;
    this.prng = prng;
    this.clips = [];
  }

  generateIdle(duration = 2.0) {
    const clip = new AnimationClip('idle', duration);
    const joints = this.skeleton.joints || [];

    for (const joint of joints) {
      if (joint.boneType === 'spine') {
        // Subtle breathing motion
        const track = clip.createTrack(joint.id, 'rotation');
        track.addKeyframe(0, { x: 0, y: 0, z: 0 });
        track.addKeyframe(duration / 2, { x: 2, y: 0, z: 0 }, 'easeInOut');
        track.addKeyframe(duration, { x: 0, y: 0, z: 0 }, 'easeInOut');
      }
    }

    this.clips.push(clip);
    return clip;
  }

  generateWalk(duration = 1.0) {
    const clip = new AnimationClip('walk', duration);
    const joints = this.skeleton.joints || [];

    // Find pairs of limbs for alternating motion
    const limbs = joints.filter(j => j.boneType === 'limb');

    for (let i = 0; i < limbs.length; i++) {
      const joint = limbs[i];
      const phase = (i % 2) * 0.5; // Alternate phase

      const track = clip.createTrack(joint.id, 'rotation');
      track.addKeyframe(phase * duration, { x: -30, y: 0, z: 0 }, 'easeInOut');
      track.addKeyframe((phase + 0.5) * duration % duration, { x: 30, y: 0, z: 0 }, 'easeInOut');
      track.addKeyframe(duration, { x: -30, y: 0, z: 0 }, 'easeInOut');
    }

    this.clips.push(clip);
    return clip;
  }

  generateProcedural(name, options = {}) {
    const clip = new AnimationClip(name, options.duration || 1.0);
    const joints = this.skeleton.joints || [];

    for (const joint of joints) {
      // Random subtle animation
      const amplitude = (options.amplitude || 5) * this.prng.next();
      const track = clip.createTrack(joint.id, 'rotation');

      for (let i = 0; i <= 4; i++) {
        const time = (i / 4) * clip.duration;
        const angle = Math.sin(i * Math.PI / 2) * amplitude;
        track.addKeyframe(time, { x: angle, y: 0, z: 0 }, 'easeInOut');
      }
    }

    this.clips.push(clip);
    return clip;
  }

  getClips() {
    return this.clips;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// PROCEDURAL AUDIO
// ══════════════════════════════════════════════════════════════════════════════

class AudioCue {
  constructor(name, type = 'impact') {
    this.name = name;
    this.type = type;
    this.frequency = 440;
    this.duration = 0.5;
    this.envelope = { attack: 0.01, decay: 0.1, sustain: 0.5, release: 0.2 };
    this.waveform = 'sine';
  }

  toJSON() {
    return {
      name: this.name,
      type: this.type,
      frequency: this.frequency,
      duration: this.duration,
      envelope: this.envelope,
      waveform: this.waveform
    };
  }
}

class AudioGenerator {
  constructor(prng) {
    this.prng = prng;
    this.cues = [];
  }

  generateFootstep() {
    const cue = new AudioCue('footstep', 'impact');
    cue.frequency = 80 + this.prng.next() * 40;
    cue.duration = 0.15;
    cue.envelope = { attack: 0.001, decay: 0.05, sustain: 0.1, release: 0.1 };
    cue.waveform = 'noise';
    this.cues.push(cue);
    return cue;
  }

  generateAmbient() {
    const cue = new AudioCue('ambient', 'loop');
    cue.frequency = 100;
    cue.duration = 5.0;
    cue.envelope = { attack: 1.0, decay: 0, sustain: 1.0, release: 1.0 };
    cue.waveform = 'sine';
    this.cues.push(cue);
    return cue;
  }

  getCues() {
    return this.cues;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// ASSET GENERATOR (MAIN)
// ══════════════════════════════════════════════════════════════════════════════

class AssetGenerator extends EventEmitter {
  constructor(configPacket) {
    super();
    this.packet = configPacket;
    this.prng = configPacket.getPRNG(4);

    this.textures = {};
    this.rig = null;
    this.animations = [];
    this.audioCues = [];
    this.materials = [];

    this.statistics = {
      textureCount: 0,
      animationCount: 0,
      audioCueCount: 0,
      buildTime: 0
    };
  }

  generate(meshOutput, topologyOutput) {
    const startTime = Date.now();
    const config = this.packet.config.layers[4];

    this.emit('start', {});

    // Generate textures
    this._generateTextures(config);

    // Generate rig from skeleton
    const skeleton = topologyOutput.graph;
    this._generateRig(skeleton);

    // Generate animations
    this._generateAnimations(skeleton, config);

    // Generate audio cues
    if (config.audioEnabled) {
      this._generateAudio();
    }

    // Generate materials
    this._generateMaterials();

    this.statistics.buildTime = Date.now() - startTime;
    this.statistics.textureCount = Object.keys(this.textures).length;
    this.statistics.animationCount = this.animations.length;
    this.statistics.audioCueCount = this.audioCues.length;

    this.emit('complete', {
      textures: this.statistics.textureCount,
      animations: this.statistics.animationCount,
      time: this.statistics.buildTime
    });

    return this.getOutput();
  }

  _generateTextures(config) {
    const resolution = config.textureResolution || 512;
    const texGen = new TextureGenerator(this.prng.derive('textures'), { resolution });

    // Diffuse/Albedo
    const baseColor = Color.fromHSL(this.prng.next() * 360, 0.5, 0.5);
    const varColor = Color.fromHSL(this.prng.next() * 360, 0.4, 0.4);
    this.textures.diffuse = texGen.generateOrganic(baseColor, varColor);

    // Normal map
    const heightMap = texGen.generateNoise('worley');
    this.textures.normal = texGen.generateNormalMap(heightMap);

    // Roughness/Metallic
    this.textures.roughness = texGen.generateNoise('cellular');
  }

  _generateRig(skeleton) {
    const rigger = new AutoRigger(skeleton, this.prng.derive('rig'));
    this.rig = rigger.generateRig();
  }

  _generateAnimations(skeleton, config) {
    const animGen = new AnimationGenerator(skeleton, this.prng.derive('anim'));

    // Standard animations
    animGen.generateIdle();
    animGen.generateWalk();
    animGen.generateProcedural('breathe', { duration: 3.0, amplitude: 3 });

    this.animations = animGen.getClips();
  }

  _generateAudio() {
    const audioGen = new AudioGenerator(this.prng.derive('audio'));

    audioGen.generateFootstep();
    audioGen.generateAmbient();

    this.audioCues = audioGen.getCues();
  }

  _generateMaterials() {
    this.materials.push({
      name: 'default',
      shader: 'standard',
      textures: {
        diffuse: 'diffuse',
        normal: 'normal',
        roughness: 'roughness'
      },
      properties: {
        metallic: 0.0,
        roughness: 0.5,
        emission: 0.0
      }
    });
  }

  getOutput() {
    return {
      textures: Object.fromEntries(
        Object.entries(this.textures).map(([name, tex]) => [name, tex.toJSON()])
      ),
      rig: this.rig ? this.rig.toJSON() : null,
      animations: this.animations.map(a => a.toJSON()),
      audioCues: this.audioCues.map(c => c.toJSON()),
      materials: this.materials,
      statistics: this.statistics,
      cacheKey: this.packet.getCacheKey()
    };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ══════════════════════════════════════════════════════════════════════════════

export {
  Color,
  ProceduralTexture,
  TextureGenerator,
  AnimationTrack,
  AnimationClip,
  IKChain,
  ControlRig,
  AutoRigger,
  AnimationGenerator,
  AudioCue,
  AudioGenerator,
  AssetGenerator
};

export default AssetGenerator;
