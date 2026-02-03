# GENESIS 2.0 — Bootable USB

> **Owner:** Murray Bembrick (murray@bembrick.org)
> **YubiKey:** 5C FIPS (Serial: 31695265)
> **Admin:** Exclusive

---

## Quick Start

### Windows (Portable Mode)
```batch
:: Double-click or run:
GENESIS-USB.bat
```

### Linux/Mac (Portable Mode)
```bash
chmod +x GENESIS-USB.sh
./GENESIS-USB.sh
```

---

## Creating the USB with Rufus

### Requirements
- **Rufus 4.12+** (https://rufus.ie) — Important: includes TOCTOU security fix
- **USB Drive:** 8GB+ recommended
- **Node.js:** Required on target system (or use portable version)

### Step-by-Step

1. **Format USB with Rufus:**
   - Device: Your USB drive
   - Partition scheme: **GPT**
   - Target system: **UEFI (non-CSM)**
   - File system: **NTFS**
   - Volume label: **GENESIS-2.0**
   - Click **START**

2. **Copy files to USB:**
   ```
   USB Root/
   ├── EFI/                          ← from boot/EFI/
   │   └── BOOT/
   │       └── grub.cfg
   ├── genesis/                      ← from boot/genesis/
   │   ├── genesis-boot.conf
   │   └── genesis-init.sh
   ├── bembrick-ultimate-edition/    ← entire folder
   ├── autorun.inf                   ← from boot/
   ├── GENESIS-USB.bat               ← from boot/
   └── GENESIS-USB.sh                ← from boot/
   ```

3. **Optional — Portable Node.js:**
   Download Node.js portable and extract to `USB:/node/`

---

## Boot Modes

### 1. Portable Mode (Recommended)
Plug USB into a running Windows/Linux/Mac system and run the launcher script.
- Requires Node.js installed on host system
- All data stays on USB drive
- Works immediately

### 2. Live Boot Mode (Advanced)
Boot directly from USB into a GENESIS-only environment.
- Requires custom Linux kernel + initrd
- Full isolation from host system
- Forensic mode available (read-only)

---

## Directory Structure

```
boot/
├── EFI/
│   └── BOOT/
│       └── grub.cfg              # UEFI boot menu
├── genesis/
│   ├── genesis-boot.conf         # Boot configuration
│   └── genesis-init.sh           # Linux init script
├── autorun.inf                   # Windows autorun
├── GENESIS-USB.bat               # Windows launcher
├── GENESIS-USB.sh                # Linux/Mac launcher
├── rufus.toml                    # Rufus config reference
└── README.md                     # This file
```

---

## Security Features

- **YubiKey Verification:** Checks for serial 31695265
- **Admin Exclusive:** Only Murray Bembrick has admin rights
- **Portable Data:** Keys, audit logs, evidence stay on USB
- **Firewall:** Auto-configured in live boot mode
- **JWT Session:** Fresh secret generated each boot

---

## Troubleshooting

### "Node.js not found"
Install Node.js on the host system:
- **Windows:** https://nodejs.org
- **macOS:** `brew install node`
- **Ubuntu:** `sudo apt install nodejs npm`

### "YubiKey not detected"
- Ensure YubiKey is plugged in
- Install YubiKey Manager: https://www.yubico.com/support/download/yubikey-manager/
- Check serial: `ykman info`

### Server won't start
1. Check if port 8080 is in use: `netstat -an | grep 8080`
2. Check logs: `bembrick-ultimate-edition/data/logs/`
3. Run manually: `cd bembrick-ultimate-edition && npm start`

---

## Contact

**Murray Bembrick**
- Primary: murray@bembrick.org
- GitHub: @murray-ux

---

*GENESIS 2.0 — Sovereign Security Platform*
*Copyright (c) 2025 MuzzL3d Dictionary Contributors — Apache-2.0*
