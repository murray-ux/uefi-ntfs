# UEFI:NTFS Test Coverage Analysis

## Executive Summary

The core UEFI:NTFS bootloader (`boot.c`, `boot.h`, `path.c`, `system.c` — ~1,160 lines of C) has **no unit tests and no automated functional tests**. The only testing mechanisms are:

- **Build-time verification**: CI compiles across 6 architectures on 2 platforms (Linux/EDK2 and Windows/MSVC), catching compile errors and warnings.
- **Static analysis**: Coverity Scan and CodeQL run on pushes to `master`.
- **Manual QEMU integration testing**: `make qemu` launches the bootloader in an emulator with a test NTFS VHD image, but this requires human observation — there is no automated pass/fail validation.

The existing test files under `caput-ultimate-edition/test/` and `forbidden-ninja-city-charter-v1.0.0/tests/` are unrelated to the bootloader; they test separate JavaScript/TypeScript sub-projects.

---

## Current Coverage by Source File

| File | Lines | What It Does | Current Test Coverage |
|------|-------|-------------|----------------------|
| `boot.c` | 578 | Main entry point, partition discovery, FS driver loading, bootloader chain-loading | Build CI only |
| `boot.h` | 190 | Headers, macros, inline utility functions (`_SafeStrLen`, `_tolower`, `_StriCmp`, `_SafeStrCpy`) | Build CI only |
| `path.c` | 229 | Device path traversal, comparison, case-insensitive path resolution, hex conversion | Build CI only |
| `system.c` | 160 | SMBIOS parsing, Secure Boot status querying | Build CI only |

**Effective unit test coverage: 0%**
**Automated functional test coverage: 0%**

---

## Proposed Improvements

### 1. Host-Side Unit Tests for Pure Logic Functions

**Priority: High**
**Effort: Low-Medium**

Several functions in the codebase are pure logic that operates on data structures rather than requiring live UEFI firmware services. These can be extracted and tested with a standard C test framework (e.g., [CMocka](https://cmocka.org/) or a minimal custom harness) by providing thin stubs/mocks for UEFI types.

**Testable functions:**

#### a) `_tolower` and `_StriCmp` (`boot.h:139-154`)
- Case conversion for `CHAR16` characters
- Case-insensitive string comparison
- **Test cases to add:**
  - ASCII boundary values (`'A'`, `'Z'`, `'a'`, `'z'`, `'0'`, special chars)
  - Equal strings differing only in case
  - Strings of different lengths
  - Empty strings
  - Strings at `STRING_MAX` boundary

#### b) `_SafeStrLen` (`boot.h:125-131`)
- Safe string length with bounds checking
- **Test cases to add:**
  - Normal strings of various lengths
  - Empty string (length 0)
  - String at `STRING_MAX - 1` (edge of valid)
  - NULL pointer behavior (assert path)

#### c) `_SafeStrCpy` (`boot.h:160-178`)
- Bounds-checked string copy
- **Test cases to add:**
  - Normal copy within bounds
  - Source exactly filling `DestMax - 1`
  - Empty source string
  - `DestMax` boundary conditions

#### d) `CompareDevicePaths` (`path.c:67-107`)
- Compares two UEFI device paths node-by-node
- **Test cases to add:**
  - Two identical device paths → returns 0
  - NULL inputs → returns -1
  - Paths differing in type, subtype, or length
  - Paths differing in content but same structure
  - Single-node vs multi-node paths

#### e) `GetLastDevicePath` (`path.c:23-35`)
- Returns the last non-end node in a device path
- **Test cases to add:**
  - Single-node path (just end node) → returns NULL
  - Two-node path → returns first node
  - Multi-node path → returns second-to-last node

#### f) `GetParentDevice` (`path.c:41-59`)
- Strips the last node from a device path to get the parent
- **Test cases to add:**
  - Multi-level device path → returns path without last node
  - Single-level path → returns end-node path
  - NULL input → returns NULL

#### g) `DevicePathToHex` (`path.c:176-203`)
- Converts raw device path bytes to hex string
- **Test cases to add:**
  - Known byte sequences → expected hex output
  - NULL input → returns NULL
  - Single-node device paths
  - Multi-node device paths

#### h) `GetSmbiosString` (`system.c:48-74`)
- Parses SMBIOS unformatted string sections
- **Test cases to add:**
  - Retrieve string 1, 2, 3 from a synthetic SMBIOS structure
  - `StringNumber = 0xFFFF` → advances to next structure
  - Double-NUL termination handling
  - Missing string number (out of range)

#### i) `GetSecureBootStatus` (`system.c:138-160`)
- Queries UEFI variables for Secure Boot state
- **Test cases to add (with mocked `gRT->GetVariable`):**
  - `SecureBoot=1, SetupMode=0` → returns 1 (enabled)
  - `SecureBoot=0, SetupMode=0` → returns 0 (disabled)
  - `SecureBoot=1, SetupMode=1` → returns -1 (setup mode)
  - Variable not found → returns 0

### 2. QEMU-Based Automated Integration Tests

**Priority: High**
**Effort: Medium**

The `make qemu` target currently requires manual observation. This should be automated in CI.

**Proposed approach:**
- Modify the QEMU test VHD images to contain a known-good bootloader that writes a specific string (e.g., `"UEFI_NTFS_TEST_PASS"`) to the QEMU serial output.
- Capture QEMU serial/console output to a log file.
- Add a CI step that runs QEMU with a timeout and `grep`s the log for the expected output.
- Test both NTFS and exFAT VHD images.

**Test scenarios:**
- Successful NTFS chain-load → expected serial output appears
- Successful exFAT chain-load → expected serial output appears
- Missing bootloader on target partition → appropriate error message appears
- Wrong architecture bootloader → "incompatible" error message appears

### 3. `SetPathCase` Functional Tests

**Priority: Medium**
**Effort: Medium**

`SetPathCase` (`path.c:110-168`) is the most complex pure function — it performs recursive case-insensitive path resolution on a UEFI file system. Testing it requires mocking `EFI_FILE_HANDLE` and `EFI_FILE_PROTOCOL`.

**Test cases to add:**
- `\EFI\BOOT\BOOTX64.EFI` on a filesystem with `\efi\boot\bootx64.efi` → resolves correctly
- Mixed-case directories → each level resolved independently
- Non-existent path → returns `EFI_NOT_FOUND`
- NULL root / NULL path / path not starting with `\` → returns `EFI_INVALID_PARAMETER`
- Deeply nested paths (recursion depth)

### 4. Filesystem Magic Detection Tests

**Priority: Medium**
**Effort: Low**

The NTFS/exFAT detection logic in `efi_main` (`boot.c:248-354`) compares OEM ID bytes at offset 3 of the first block. This logic could be extracted into a standalone function and unit-tested.

**Test cases to add:**
- Block with `"NTFS    "` at offset 3 → detected as NTFS (FsType=0)
- Block with `"EXFAT   "` at offset 3 → detected as exFAT (FsType=1)
- Block with neither magic → not detected
- Block with partial match → not detected
- Block with magic at wrong offset → not detected

### 5. Cross-Architecture Build Smoke Tests

**Priority: Low**
**Effort: Low**

The CI currently builds for all architectures but doesn't verify the output beyond SHA-256 hashes. Add basic validation:

- Verify each `.efi` binary is a valid PE32+ executable
- Verify the machine type field matches the expected architecture
- Verify the subsystem field is `EFI_APPLICATION` (0x0A)
- Check that the binary size is within expected bounds (not empty, not unreasonably large)

### 6. DisconnectBlockingDrivers and UnloadDriver Tests

**Priority: Low**
**Effort: High**

These functions (`boot.c:92-153`, `boot.c:158-194`) are deeply integrated with UEFI Boot Services protocol calls. Testing them requires either:
- A comprehensive UEFI mock framework
- Running within a UEFI test harness (e.g., UEFI Shell + test application)

**Recommendation:** Defer to QEMU integration tests rather than attempting to unit test these.

---

## Recommended Implementation Order

1. **Set up a C unit test framework** with UEFI type stubs — enables items 1a-1i
2. **Add unit tests for inline utility functions** (`_tolower`, `_StriCmp`, `_SafeStrLen`, `_SafeStrCpy`) — highest coverage gain for lowest effort
3. **Add unit tests for path functions** (`CompareDevicePaths`, `GetLastDevicePath`, `GetParentDevice`, `DevicePathToHex`)
4. **Add unit tests for SMBIOS parsing** (`GetSmbiosString`)
5. **Extract and test FS magic detection** from `efi_main`
6. **Automate QEMU integration tests** in CI with serial output capture
7. **Add PE binary validation** to CI build steps
8. **Add `SetPathCase` tests** with mocked file handles
9. **Add `GetSecureBootStatus` tests** with mocked runtime services

## Suggested Test Framework Setup

Since this is a UEFI project compiled with both gnu-efi and EDK2, a pragmatic approach is:

```
tests/
├── Makefile                    # Build and run host-side tests
├── uefi_stubs.h                # Minimal UEFI type definitions for host compilation
├── test_string_utils.c         # Tests for _tolower, _StriCmp, _SafeStrLen, _SafeStrCpy
├── test_device_path.c          # Tests for CompareDevicePaths, GetLastDevicePath, etc.
├── test_smbios.c               # Tests for GetSmbiosString
├── test_fs_detection.c         # Tests for NTFS/exFAT magic byte detection
└── ci/
    └── qemu_integration.sh     # Automated QEMU smoke test script
```

The test binaries would compile with the host C compiler (not a cross-compiler) using the stub headers, making them fast to build and run on any CI runner without UEFI toolchain dependencies.
