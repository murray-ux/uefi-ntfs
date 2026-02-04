# Trust Boundaries

## B1: Owner vs. System
- System never escalates authority beyond owner intent.
- Policy engine enforces owner-written rules; cannot override owner.

## B2: Boot Chain vs. OS
- Secure Boot + TPM PCR binding gates OS execution.
- Bootloader is immutable; kernel is signed.

## B3: Base Image vs. Data
- Base is immutable (read-only); data is sealed and separately verified.
- Any modification to base requires rebuild.

## B4: Python vs. Rust Integrity Boundary
- Python may request integrity checks.
- Only Rust asserts integrity truth (non-bypassable).

## B5: Host vs. Cloud
- Cloud VM is execution venue only; never authority.
- Local hardware root (MSI Titan) has final say.
