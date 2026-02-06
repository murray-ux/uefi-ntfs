# Verification Matrix

| Layer   | Check                              | Method                              | Required |
|---------|-------------------------------------|--------------------------------------|----------|
| BOOT    | Secure Boot enabled                | verify/boot_check.sh                | Yes      |
| FIRMWARE| Intel HEX checksums + SHA-256      | verify/firmware_check.sh            | Yes      |
| KERNEL  | Signed kernel                      | bootloader / signature policy       | Yes      |
| FS      | Repository tree hash matches       | build/hashes/ + verifier            | Yes      |
| RUNTIME | Rust integrity boundary reachable  | RUST_BOUNDARY call                  | Yes      |
| POLICY  | Egress allow-list enforced         | core/policy_engine.py               | Yes      |
| AUDIT   | Append-only log chain intact       | core/audit.py                       | Yes      |

## Failure Semantics

All gates are **fail-closed**: any failure halts execution immediately.
Unknown state = compromise state.
