# CLAUDE.md — AI Assistant Guide for UEFI:NTFS

## Project Overview

**UEFI:NTFS** is a UEFI bootloader (chain loader) that enables booting from NTFS or exFAT partitions. Standard UEFI firmware only supports booting from FAT32, which has a 4 GB file size limit. UEFI:NTFS solves this by residing on a small FAT32 partition at the end of a USB drive and chain-loading the actual bootloader from an NTFS or exFAT data partition.

- **Primary use case**: Rufus USB boot media creation for Windows installation
- **Author**: Pete Batard (pete@akeo.ie), Copyright 2014-2025
- **License**: GPLv2-or-later (SPDX: `GPL-2.0-or-later`)
- **Upstream repository**: `pbatard/uefi-ntfs`
- **Project URL**: https://un.akeo.ie

## Architecture Support

Six architectures are supported through unified C code with compile-time architecture selection:

| Arch ID | Platform | EFI Binary | Cross-Compiler Tuple |
|---------|----------|------------|---------------------|
| `x64` | 64-bit x86 | `bootx64.efi` | `x86_64-w64-mingw32-` |
| `ia32` | 32-bit x86 | `bootia32.efi` | `i686-w64-mingw32-` |
| `arm` | 32-bit ARM | `bootarm.efi` | `arm-linux-gnueabihf-` |
| `aa64` | 64-bit ARM | `bootaa64.efi` | `aarch64-linux-gnu-` |
| `riscv64` | 64-bit RISC-V | `bootriscv64.efi` | `riscv64-linux-gnu-` |
| `loongarch64` | 64-bit LoongArch | `bootloongarch64.efi` | `loongarch64-unknown-linux-gnu-` |

## Source Code Structure

The entire bootloader is ~800 lines of C across three source files plus two headers:

```
boot.c      - Main entry point (efi_main) and core bootloader logic:
              driver disconnection, NTFS/exFAT partition discovery,
              filesystem driver loading, bootloader chain-loading.
              Derived in part from rEFInd (BSD-3-Clause compatible).

boot.h      - Shared header: macros, safe string functions (SafeStrLen,
              SafeStrCpy, _StriCmp), console color helpers, assertion
              macros, and function prototypes. Contains both gnu-efi
              and EDK2 include paths behind #ifdef __MAKEWITH_GNUEFI.

path.c      - Device path manipulation: GetParentDevice, CompareDevicePaths,
              SetPathCase (case-insensitive path lookup on case-sensitive FS),
              DevicePathToString/DevicePathToHex. Parts from GRUB (GPLv2+).

system.c    - System info: SMBIOS table reading, UEFI firmware version
              display, Secure Boot status query. Parts from EDK (Intel).

version.h   - Auto-generated version string. Set to L"[DEV]" for local
              builds; CI replaces it with git tag via `git describe --tags`.
```

## Build Systems

There are three ways to build this project:

### 1. GNU-EFI with Make (Linux/MinGW) — `Makefile`

```bash
# Default (auto-detects host architecture)
make

# Specific architecture
make ARCH=x64
make ARCH=ia32 CROSS_COMPILE=i686-w64-mingw32-

# QEMU debug (adds -D_DEBUG, downloads OVMF + test NTFS image)
make qemu

# Clean
make clean       # Remove build artifacts
make superclean  # Also clean gnu-efi and downloaded files
```

**Requirements**: GCC 4.7+, gnu-efi (git submodule in `gnu-efi/`)

**Key details**:
- Object files: `boot.o`, `path.o`, `system.o`
- Output: `boot.efi`
- The `gnu-efi/` submodule must be initialized (`git submodule update --init`)
- ARM/AARCH64 builds produce ELF first, then convert to PE via `objcopy`
- Compiler flags include `-Werror-implicit-function-declaration -Wall -Wshadow`

### 2. EDK2 with GCC (Linux) — `uefi-ntfs.dsc`/`uefi-ntfs.inf`

```bash
export EDK2_PATH=/path/to/edk2
export WORKSPACE=$PWD
export PACKAGES_PATH=$WORKSPACE:$EDK2_PATH
source $EDK2_PATH/edksetup.sh --reconfig
build -a X64 -b RELEASE -t GCC5 -p uefi-ntfs.dsc
```

**Requirements**: EDK2 source tree (stable tag: `edk2-stable202508.01`), architecture-specific cross-compilers

### 3. EDK2 with MSVC (Windows) — `uefi-ntfs.sln`

Open `uefi-ntfs.sln` in Visual Studio 2022. Supports x64, ia32, aa64 platform targets.

**Requirements**: Visual Studio 2022 with ARM/ARM64 build tools, NASM

## CI/CD Workflows

All workflows are in `.github/workflows/` and trigger on pushes/PRs to `master`:

| Workflow | File | Platform | What it does |
|----------|------|----------|-------------|
| Linux build | `linux.yml` | ubuntu-24.04 | EDK2+GCC build for all 6 architectures; creates GitHub releases on tags |
| Windows build | `windows.yml` | windows-latest | MSVC+gnu-efi build for x64, ia32, aa64 |
| CodeQL | `codeql.yml` | windows-latest | Static analysis (C++ language, Debug x64) |
| Coverity | `coverity.yml` | windows-latest | Coverity Scan (push to master only) |

## Testing

There is no unit test suite. Testing is done via QEMU emulation:

```bash
make qemu  # Builds with _DEBUG, downloads OVMF firmware + NTFS test VHD, runs in QEMU
```

The `_DEBUG` flag relaxes the same-device partition check, allowing testing with separate QEMU drives. The NTFS test image (`ntfs.vhd`) contains stub `boot*.efi` files that print "Hello from NTFS!".

## Code Conventions

### Style
- **Indentation**: Tabs for indentation (not spaces)
- **Braces**: Opening brace on same line for functions and control structures
- **Naming**: PascalCase for functions, types, and variables (UEFI convention). UPPER_CASE for macros/constants
- **Comments**: C-style `/* */` for block comments, `//` for inline. Comments above code, not to the right
- **String types**: `CHAR16*` for UEFI strings (wide), `CHAR8*` for ASCII/byte buffers
- **Return types**: Use UEFI types (`EFI_STATUS`, `UINTN`, `INTN`, `BOOLEAN`, `VOID`, etc.)

### Safety patterns
- Always use `SafeStrLen()`, `SafeStrCpy()`, `SafeFree()` instead of raw equivalents
- `SafeFree()` NULLs the pointer after freeing
- Assertions via `V_ASSERT()` macro (halts on failure in debug builds)
- `_StriCmp()` is a custom case-insensitive compare to work around broken UEFI firmware Unicode collation

### Conditional compilation
- `__MAKEWITH_GNUEFI` — gnu-efi build path (includes `<efi.h>`)
- Without it — EDK2 build path (includes `<Uefi.h>`)
- `_DEBUG` — enables relaxed checks for QEMU testing
- `CONFIG_<arch>` — architecture-specific defines from Makefile

### Commit messages
- Use imperative mood: "Add feature", "Fix bug", "Update component"
- Be descriptive about what changed and why
- The upstream project's default branch is `master`

## Important Constraints

- **Secure Boot compatibility**: The bootloader and its FS drivers must be signed by Microsoft for Secure Boot. GPLv3-licensed drivers cannot be signed (Microsoft policy), so only GPLv2 ntfs-3g drivers are used.
- **No runtime allocation libraries**: This is bare-metal UEFI code. Use `AllocatePool`/`FreePool` from UEFI Boot Services, not malloc/free.
- **Wide strings everywhere**: All user-visible strings are `CHAR16*` (UCS-2). Use `L"..."` string literals.
- **Entry point must be `efi_main`**: Required for gnu-efi crt0 compatibility.
- **version.h is auto-generated in CI**: Do not commit meaningful changes to this file. It is overwritten during CI builds with the git tag version.

## Security Reporting

Vulnerabilities should be reported to support@akeo.ie following responsible disclosure practices. See `SECURITY.md`.
