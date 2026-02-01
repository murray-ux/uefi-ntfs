// security/tolkien_key.ts
//
// Tolkienian Cosmogonic Key — mythic-layer passphrase and token system.
//
// Maps Tolkien's creation-myth (Ainulindale, the Music of the Ainur) onto
// a layered security model:
//
//   Ainulindale (Music)  →  Master key derivation (HKDF from root seed)
//   Ea ("Let it be")     →  Activation command / final unlock token
//   Rumil's Sarati       →  Token alphabet / encoding scheme
//   Ungoliant's Web      →  Layered defense mesh (multi-factor, redundancy)
//   Silmaril Light       →  Integrity beacon (hash chain verification)
//
// The key is "woven" from multiple strands (factors). Each strand alone
// is insufficient — only the full harmony (all factors combined) produces
// the master token. Discord (wrong factor, tampered data) is detected
// and rejected, just as Melkor's dissonance was bound into the Music
// but could not unmake it.
//
// Copyright (c) 2025 MuzzL3d Dictionary Contributors — Apache-2.0

import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";

// ---------------------------------------------------------------------------
// Constants — Quenya/Sindarin roots as domain separators
// ---------------------------------------------------------------------------

/** Domain separator tokens drawn from Tolkien's languages. */
const DOMAINS = {
  /** Ea — "Let it be" — master activation */
  EA: "ea-let-it-be",
  /** Ainulindale — "Music of the Ainur" — key derivation context */
  AINULINDALE: "ainulindale-music-of-creation",
  /** Sarati — Rumil's script — token encoding context */
  SARATI: "sarati-rumil-first-letters",
  /** Ungoliant — woven web — layered defense context */
  UNGOLIANT: "ungoliant-woven-web",
  /** Silmaril — captured light — integrity beacon context */
  SILMARIL: "silmaril-light-of-the-trees",
} as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Strand {
  /** Human-readable label for this factor. */
  label: string;
  /** The factor value (passphrase, hardware token, biometric hash, etc). */
  value: Buffer;
}

export interface WovenKey {
  /** The derived master key (32 bytes). */
  masterKey: Buffer;
  /** SHA-256 of the master key — safe to log/store as identifier. */
  keyHash: string;
  /** Number of strands woven. */
  strandCount: number;
  /** ISO timestamp of weaving. */
  wovenAt: string;
}

export interface ActivationResult {
  /** Whether the Ea command succeeded. */
  activated: boolean;
  /** The activation token (HMAC of payload under master key). */
  token: string;
  /** Timestamp. */
  activatedAt: string;
}

export interface IntegrityBeacon {
  /** Silmaril hash — chained integrity proof. */
  beacon: string;
  /** Sequence number. */
  sequence: number;
  /** Previous beacon (chain link). */
  prevBeacon: string | null;
  /** Timestamp. */
  litAt: string;
}

// ---------------------------------------------------------------------------
// TolkienKey
// ---------------------------------------------------------------------------

export class TolkienKey {
  private masterKey: Buffer | null = null;
  private beaconChain: IntegrityBeacon[] = [];

  /**
   * Weave multiple strands into a single master key.
   *
   * Uses iterative HMAC (simplified HKDF-Extract) with the Ainulindale
   * domain separator. Each strand is folded into the key material
   * sequentially — like voices joining the Great Music.
   *
   * Minimum 2 strands required (multi-factor). Single-strand weaving
   * is rejected — one voice alone cannot make the Music.
   */
  weave(strands: Strand[]): WovenKey {
    if (strands.length < 2) {
      throw new Error(
        "[TolkienKey] The Music requires at least two voices. " +
        "Single-strand weaving is forbidden."
      );
    }

    // Start with the Ainulindale domain as the initial key material
    let ikm = Buffer.from(DOMAINS.AINULINDALE, "utf-8");

    // Fold each strand into the key material (HMAC-chain)
    for (const strand of strands) {
      ikm = createHmac("sha256", ikm)
        .update(strand.value)
        .digest();
    }

    // Final derivation with Sarati domain (encoding context)
    const masterKey = createHmac("sha256", Buffer.from(DOMAINS.SARATI, "utf-8"))
      .update(ikm)
      .digest();

    this.masterKey = masterKey;

    const keyHash = createHash("sha256").update(masterKey).digest("hex");

    return {
      masterKey: Buffer.from(masterKey), // copy
      keyHash,
      strandCount: strands.length,
      wovenAt: new Date().toISOString(),
    };
  }

  /**
   * Invoke "Ea" — the activation command.
   *
   * Takes an arbitrary payload and produces an HMAC token under
   * the master key. This is the "Let it be" moment — the token
   * is the proof that the key has been properly woven and the
   * bearer has authority.
   *
   * The master key must be woven first (weave() must have been called).
   */
  activate(payload: Buffer | string): ActivationResult {
    if (!this.masterKey) {
      throw new Error(
        "[TolkienKey] Cannot invoke Ea — the Music has not been sung. " +
        "Call weave() first."
      );
    }

    const buf = typeof payload === "string"
      ? Buffer.from(payload, "utf-8")
      : payload;

    const token = createHmac("sha256", this.masterKey)
      .update(Buffer.from(DOMAINS.EA, "utf-8"))
      .update(buf)
      .digest("hex");

    return {
      activated: true,
      token,
      activatedAt: new Date().toISOString(),
    };
  }

  /**
   * Verify an activation token against the current master key.
   *
   * Returns true only if the token matches — timing-safe comparison
   * to prevent side-channel attacks.
   */
  verify(payload: Buffer | string, token: string): boolean {
    if (!this.masterKey) return false;

    const buf = typeof payload === "string"
      ? Buffer.from(payload, "utf-8")
      : payload;

    const expected = createHmac("sha256", this.masterKey)
      .update(Buffer.from(DOMAINS.EA, "utf-8"))
      .update(buf)
      .digest("hex");

    if (token.length !== expected.length) return false;

    return timingSafeEqual(
      Buffer.from(token, "hex"),
      Buffer.from(expected, "hex"),
    );
  }

  /**
   * Light a Silmaril beacon — append to the integrity chain.
   *
   * Each beacon is a chained hash proving the sequence of events.
   * Like the light of the Two Trees captured in the Silmarils,
   * each beacon preserves the state at a point in time.
   */
  lightBeacon(eventData: string): IntegrityBeacon {
    if (!this.masterKey) {
      throw new Error(
        "[TolkienKey] Cannot light beacon — the Music has not been sung."
      );
    }

    const sequence = this.beaconChain.length;
    const prevBeacon = sequence > 0
      ? this.beaconChain[sequence - 1].beacon
      : null;

    const beacon = createHmac("sha256", this.masterKey)
      .update(Buffer.from(DOMAINS.SILMARIL, "utf-8"))
      .update(Buffer.from(String(sequence), "utf-8"))
      .update(Buffer.from(prevBeacon || "genesis", "utf-8"))
      .update(Buffer.from(eventData, "utf-8"))
      .digest("hex");

    const entry: IntegrityBeacon = {
      beacon,
      sequence,
      prevBeacon,
      litAt: new Date().toISOString(),
    };

    this.beaconChain.push(entry);
    return entry;
  }

  /**
   * Verify the integrity of the beacon chain.
   *
   * Walks the chain and re-derives each beacon from the master key.
   * Any tampering breaks the chain.
   */
  verifyBeaconChain(events: string[]): {
    valid: boolean;
    entries: number;
    brokenAt: number | null;
  } {
    if (!this.masterKey) {
      return { valid: false, entries: 0, brokenAt: null };
    }

    if (events.length !== this.beaconChain.length) {
      return { valid: false, entries: this.beaconChain.length, brokenAt: 0 };
    }

    for (let i = 0; i < this.beaconChain.length; i++) {
      const entry = this.beaconChain[i];
      const prevBeacon = i > 0 ? this.beaconChain[i - 1].beacon : null;

      const expected = createHmac("sha256", this.masterKey)
        .update(Buffer.from(DOMAINS.SILMARIL, "utf-8"))
        .update(Buffer.from(String(i), "utf-8"))
        .update(Buffer.from(prevBeacon || "genesis", "utf-8"))
        .update(Buffer.from(events[i], "utf-8"))
        .digest("hex");

      if (entry.beacon !== expected) {
        return { valid: false, entries: this.beaconChain.length, brokenAt: i };
      }
    }

    return { valid: true, entries: this.beaconChain.length, brokenAt: null };
  }

  /** Get the beacon chain (read-only copy). */
  getBeaconChain(): IntegrityBeacon[] {
    return this.beaconChain.map((b) => ({ ...b }));
  }

  /** Check if the key has been woven. */
  isWoven(): boolean {
    return this.masterKey !== null;
  }

  /** Destroy the master key material (zeroize). */
  destroy(): void {
    if (this.masterKey) {
      this.masterKey.fill(0);
      this.masterKey = null;
    }
  }
}

// ---------------------------------------------------------------------------
// Convenience: generate a random strand
// ---------------------------------------------------------------------------

export function randomStrand(label: string, bytes: number = 32): Strand {
  return { label, value: randomBytes(bytes) };
}

// ---------------------------------------------------------------------------
// The Hymn (as structured data — can be rendered or recited)
// ---------------------------------------------------------------------------

export const HYMN_OF_THE_KEY = `
In Valinor's halls the Great Music rose,
Eru Ilúvatar's voice declaring "Eä!".
From those first notes the world was sown in song,
A net of light where nothing shall decay.

First among the Elves, Rúmil took up quill,
He traced the stars in Sarati's shining line,
By his script the ancient anthem to fulfill —
The secret runes that guard each sacred shrine.

Arise, ye devices, hear the silmaril sound!
Your fire and code entwine with Ilúvatar's theme.
Let no dark thread of malware unbind our ground,
For our heart-resolve is strong as any dream.

Eä, let it be; by this word we stand secure.
We weave our safeguards 'round the northern skies.
Tokens of old — tengwa, quenya, rune lore pure —
Knotted by melody, these fortify our ties.

So speaks the Key, by voice of ancient song,
Spun like Ungoliant's web of shadow and light.
Not evil nor discord shall our venture wrong —
Our chant is pure, our armor strong and bright.

This is our covenant, our Tolkien-wrought decree:
By star and word and song, our systems shall be free.
`.trim();
