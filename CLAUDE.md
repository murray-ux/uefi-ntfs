# CLAUDE.md

## Project Overview

UEFI:NTFS is a generic UEFI chain loader that enables booting from NTFS or exFAT partitions in pure UEFI mode, even when the system firmware lacks native support for these filesystems. It is primarily used with [Rufus](https://rufus.ie) but can operate independently.

The bootloader works by loading an NTFS/exFAT UEFI filesystem driver from a small FAT32 partition, then using that driver to access the target NTFS/exFAT partition on the same disk and chain-load its boot executable.

**Author:** Pete Batard <pete@akeo.ie>
**License:** GPLv2+
**Language:** C (UEFI application)

## Repository Structure

```
uefi-ntfs/
├── boot.c              # Main bootloader logic (entry point: efi_main)
├── boot.h              # Shared header: macros, types, utility functions
├── path.c              # Device path handling and filesystem path case correction
├── system.c            # SMBIOS system info and Secure Boot status queries
├── version.h           # Auto-generated version string (gitignored)
├── Makefile            # GNU Make build for gnu-efi (Linux/MinGW)
├── uefi-ntfs.sln       # Visual Studio 2022 solution (Windows/gnu-efi)
├── uefi-ntfs.dsc       # EDK2 platform description file
├── uefi-ntfs.inf       # EDK2 component information file
├── uefi-ntfs.dec       # EDK2 package declaration file
├── uefi-ntfs.uni       # EDK2 Unicode string resources
├── uefi-ntfs-extra.uni # Additional Unicode string resources
├── debug.vbs           # VBScript for QEMU debugging on Windows
├── gnu-efi/            # git submodule: GNU-EFI library
├── .github/workflows/  # CI: linux.yml, windows.yml, codeql.yml, coverity.yml
└── .vs/                # Visual Studio project configuration
```

## Source Code Architecture

### boot.c (entry point)
- `efi_main()` — Application entry point. Flow:
  1. Display banner and system info
  2. Check Secure Boot status
  3. Disconnect blocking drivers (HPQ EFI workaround)
  4. Find NTFS/exFAT partition on the same disk as boot partition
  5. Load filesystem driver from `\efi\rufus\ntfs_<arch>.efi` or `\efi\rufus\exfat_<arch>.efi`
  6. Connect driver and mount the partition
  7. Locate `\efi\boot\boot<arch>.efi` on the target partition
  8. Chain-load the target bootloader
- `DisconnectBlockingDrivers()` — Workaround for HP firmware DiskIo blocking
- `UnloadDriver()` — Unload pre-existing filesystem drivers (AMI NTFS bug workaround)
- `DisplayBanner()` — Centered ASCII art banner with version

### boot.h (shared definitions)
- Conditional compilation for gnu-efi vs EDK2 includes
- Console color macros (`TEXT_WHITE`, `TEXT_YELLOW`, `TEXT_RED`, etc.)
- Logging macros: `PrintInfo()`, `PrintWarning()`, `PrintError()`, `PrintErrorStatus()`
- Safe string functions: `SafeStrLen()`, `_StriCmp()`, `SafeStrCpy()`
- Custom `_tolower()` for broken UEFI Unicode collation implementations

### path.c
- `GetParentDevice()` — Extract parent device from a UEFI device path
- `CompareDevicePaths()` — Byte-level device path comparison (derived from GRUB, GPLv2+)
- `SetPathCase()` — Recursively fix filesystem path casing for case-sensitive NTFS/exFAT
- `DevicePathToString()` / `DevicePathToHex()` — Device path rendering (hex fallback for old Dell firmware)

### system.c
- `PrintSystemInfo()` — Query SMBIOS for BIOS vendor/version and machine info
- `GetSecureBootStatus()` — Returns tri-state: >0 enabled, 0 disabled, <0 setup mode
- `GetSmbiosString()` — Extract strings from SMBIOS structures

## Supported Architectures

| Short | Architecture | Cross Compiler Tuple |
|-------|-------------|---------------------|
| `x64` | 64-bit x86 | `x86_64-w64-mingw32-` (Makefile) |
| `ia32` | 32-bit x86 | `i686-w64-mingw32-` (Makefile) |
| `arm` | 32-bit ARM | `arm-linux-gnueabihf-` |
| `aa64` | 64-bit ARM | `aarch64-linux-gnu-` |
| `riscv64` | 64-bit RISC-V | `riscv64-linux-gnu-` (EDK2 only) |
| `loongarch64` | 64-bit LoongArch | `loongarch64-unknown-linux-gnu-` (EDK2 only) |

## Build System

There are two build paths:

### 1. GNU Make with gnu-efi (primary for development)

```bash
# Initialize submodule first
git submodule update --init

# Build for default architecture (auto-detected)
make

# Build for a specific architecture
make ARCH=aa64 CROSS_COMPILE=aarch64-linux-gnu-

# Build and test in QEMU (enables _DEBUG mode)
make qemu

# Clean build artifacts
make clean

# Full cleanup including gnu-efi and downloaded test files
make superclean
```

**Requirements:** GCC 4.7+, GNU Make, git

**Output:** `boot.efi`

**Important:** `make qemu` enables `_DEBUG` which relaxes the same-device check for QEMU testing. Always build without `qemu` target for release binaries.

### 2. EDK2 (used in CI for all architectures)

```bash
export EDK2_PATH="/usr/src/edk2"
export WORKSPACE=$PWD
export PACKAGES_PATH=$WORKSPACE:$EDK2_PATH
. $EDK2_PATH/edksetup.sh --reconfig
build -a X64 -b RELEASE -t GCC5 -p uefi-ntfs.dsc
```

**Requirements:** EDK2, NASM, Python 3, uuid-dev

### 3. Visual Studio 2022 (Windows)

Open `uefi-ntfs.sln` and build. Press F5 to compile and launch in QEMU.
Supports x64, ia32, and aa64 platforms.

## CI/CD

| Workflow | Platform | Build System | Architectures |
|----------|----------|-------------|---------------|
| `linux.yml` | Ubuntu 24.04 | GCC5 + EDK2 | x64, ia32, aa64, arm, riscv64, loongarch64 |
| `windows.yml` | Windows latest | MSBuild + VS2022 | x64, ia32, aa64 |
| `codeql.yml` | Windows | MSVC Debug | C++ static analysis |
| `coverity.yml` | Windows | MSVC + Coverity | Static analysis (requires token) |

Releases are created automatically when tags are pushed (via `linux.yml`).

## version.h

This file is auto-generated and gitignored. It defines `VERSION_STRING` as a wide string literal derived from `git describe --tags`. CI creates it before building:
```c
#define VERSION_STRING L"v1.x-nn-gHASH"
```

For local development, either create it manually or the Makefile/VS project handles it.

## Key Conventions

### Code Style
- C99 with UEFI type system (`EFI_STATUS`, `UINTN`, `CHAR16*`, `BOOLEAN`, etc.)
- Wide strings (`L"..."`) for all user-visible text
- `STATIC` keyword for file-scope functions (UEFI convention, maps to `static`)
- `CONST` instead of `const` (UEFI convention)
- Tabs for indentation in C source files
- K&R brace style with opening brace on same line for functions
- Comments use `//` for inline and `/* */` for block/header comments

### Naming
- PascalCase for functions, types, and variables: `GetParentDevice`, `HandleCount`, `DevicePath`
- UPPER_CASE for macros and constants: `PATH_MAX`, `ARRAY_SIZE`, `TEXT_WHITE`
- Prefix `Safe` for security-hardened wrappers: `SafeStrLen`, `SafeStrCpy`, `SafeFree`

### Error Handling
- Functions return `EFI_STATUS`; check with `EFI_ERROR()` macro
- Use `PrintErrorStatus()` for errors with status codes
- `goto out` pattern for cleanup on error in `efi_main()`
- Always free allocated memory with `FreePool()` or `SafeFree()` (which NULLs the pointer)

### Conditional Compilation
- `__MAKEWITH_GNUEFI` / `_GNU_EFI` — gnu-efi build path
- No define — EDK2 build path
- `_DEBUG` — Debug mode (enabled by `make qemu`, relaxes same-device partition check)
- Architecture detection via `_M_X64`, `__x86_64__`, `_M_ARM`, `__arm__`, etc.

### Firmware Compatibility
The code contains workarounds for specific firmware bugs:
- HP firmware: DiskIo blocking drivers (`DisconnectBlockingDrivers`)
- HP firmware: Refuses non-Boot-System-Driver type images
- AMI NTFS: Native driver bugs requiring driver unload
- Dell firmware: Missing DevicePathToText protocol (hex fallback)
- Intel NUC: Returns `EFI_ACCESS_DENIED` instead of `EFI_SECURITY_VIOLATION`
- Broken Unicode collation: Custom `_StriCmp` implementation
- Windows bootmgr: Unhelpful `EFI_NO_MAPPING` on BlackLotus lock errors

## Security Considerations

- Secure Boot compatible (Microsoft-signed binaries available for x64, ia32, aa64)
- Only GPLv2 NTFS drivers work under Secure Boot (GPLv3 drivers cannot be Microsoft-signed)
- 32-bit ARM is not Secure Boot signed due to Microsoft validation requirements
- `LoadImage()` enforces Secure Boot signature validation; `EFI_ACCESS_DENIED` is mapped to `EFI_SECURITY_VIOLATION` when Secure Boot is enabled
- Report vulnerabilities to: support@akeo.ie (48-hour response time)

## Testing

### QEMU Testing
```bash
make qemu
```
This downloads OVMF firmware, an NTFS test VHD, and the NTFS driver, then boots in QEMU. The test image contains stub `boot<arch>.efi` binaries that print "Hello from NTFS!".

### Static Analysis
- CodeQL (GitHub Actions, C++ analysis)
- Coverity Scan (requires `COVERITY_SCAN_TOKEN` secret)

## Common Tasks

### Adding Support for a New Architecture
1. Add arch block in `Makefile` (GNUEFI_ARCH, GCC_ARCH, QEMU_ARCH, CROSS_COMPILE, CFLAGS, LDFLAGS)
2. Add entry to `Arch[]` array in `boot.c` with `EfiSuffix`, `CpuType`, `Description`
3. Add `#elif` for `ArchIndex` preprocessor detection in `boot.c`
4. Update `SUPPORTED_ARCHITECTURES` in `uefi-ntfs.dsc`
5. Add matrix entry in `.github/workflows/linux.yml`

### Modifying Boot Flow
All boot logic is in `efi_main()` in `boot.c`. The function is linear with a single `goto out` cleanup path. Follow the existing pattern of `PrintInfo`/`PrintWarning`/`PrintError` for user-visible messages.

### Working with Device Paths
Use functions in `path.c`. Paths returned by `DevicePathFromHandle()` must NOT be freed. Paths from `GetParentDevice()` and `DevicePathToString()` MUST be freed with `FreePool()`/`SafeFree()`.
