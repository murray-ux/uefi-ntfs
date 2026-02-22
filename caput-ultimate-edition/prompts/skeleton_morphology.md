# Skeleton Morphology Rules & Constraints

**Copyright 2025 murray-ux — Apache-2.0**

## Overview

This document defines anatomical rules and constraints for procedural skeleton generation in the Master Generation Skeleton Ecosystem.

## Joint Types

### Fixed (0 DOF)
- No movement allowed
- Used for: Root anchors, rigid connections
- Typical locations: Base/ground contact

### Hinge (1 DOF)
- Single axis rotation
- Used for: Elbows, knees, fingers
- Default limits: -90° to +90°

### Pivot (1 DOF)
- Full rotation around single axis
- Used for: Neck rotation, wrist rotation
- Default limits: -180° to +180°

### Ball (3 DOF)
- Full spherical rotation
- Used for: Shoulders, hips, spine
- Default limits: ±45° per axis

### Saddle (2 DOF)
- Two perpendicular rotation axes
- Used for: Thumbs, ankles
- Default limits: ±60° primary, ±30° secondary

## Bone Types

### Root
- Single instance per skeleton
- Ground/base contact point
- No parent, serves as hierarchy anchor

### Spine
- Central axis of skeleton
- Connects root to extremities
- Typically 3-7 bones
- Ball joints with reduced range

### Limb
- Connected to spine
- Primary appendages
- Usually paired (bilateral symmetry)
- 2-3 bones typical

### Extremity
- End of limb chains
- High detail potential
- Variable bone count (1-5)

### Detail
- Small accessory bones
- Cosmetic/behavioral
- Optional for generation

## Hierarchy Rules

1. **Root is always depth 0**
2. **Spine directly connects to root**
3. **Limbs branch from spine**
4. **Extremities terminate limbs**
5. **Maximum hierarchy depth: 10**

## Symmetry Guidelines

- Default: Bilateral symmetry (left/right mirroring)
- Mirror axis typically X
- Paired bones should have matching:
  - Length (within 5%)
  - Joint types
  - Connection points

## Anatomical Constraints

### Spacing
- Minimum joint spacing: 0.5 units
- Maximum bone length: 20 units
- Recommended bone length ratio: 1:0.618 (golden ratio)

### Angles
- Adjacent bones should not exceed 170° at rest
- Minimum angle between bones: 10°
- Natural pose angles based on content type

### Content Type Specifics

#### Creature
- Spine: 5-7 bones
- Limbs: 4 (quadruped) or 2 (biped)
- Extremities: 3-5 digits per limb

#### Structure
- Spine: 1-3 bones (vertical support)
- Limbs: Variable (decorative elements)
- Extremities: Optional

#### Vegetation
- Spine: 1 (trunk)
- Limbs: Variable (branches)
- Extremities: Many (leaves/tips)

## Validation Checklist

- [ ] Single root node
- [ ] No cycles in hierarchy
- [ ] All bones have valid parent
- [ ] Joint limits within physical bounds
- [ ] Symmetry preserved if enabled
- [ ] No intersecting bones
- [ ] Minimum spacing maintained

## Example Configurations

### Humanoid
```
root (fixed)
└── spine_base (ball)
    ├── spine_mid (ball)
    │   └── spine_top (ball)
    │       ├── neck (ball)
    │       │   └── head (ball)
    │       ├── shoulder_L (ball)
    │       │   └── arm_L (hinge)
    │       │       └── hand_L (saddle)
    │       └── shoulder_R (ball)
    │           └── arm_R (hinge)
    │               └── hand_R (saddle)
    ├── hip_L (ball)
    │   └── leg_L (hinge)
    │       └── foot_L (hinge)
    └── hip_R (ball)
        └── leg_R (hinge)
            └── foot_R (hinge)
```

### Quadruped
```
root (fixed)
└── spine_rear (ball)
    ├── spine_mid (ball)
    │   └── spine_front (ball)
    │       ├── neck (ball)
    │       │   └── head (ball)
    │       ├── front_leg_L (ball)
    │       │   └── front_foot_L (hinge)
    │       └── front_leg_R (ball)
    │           └── front_foot_R (hinge)
    ├── rear_leg_L (ball)
    │   └── rear_foot_L (hinge)
    ├── rear_leg_R (ball)
    │   └── rear_foot_R (hinge)
    └── tail (ball)
        └── tail_tip (ball)
```
