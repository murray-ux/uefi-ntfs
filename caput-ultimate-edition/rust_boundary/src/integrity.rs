//! integrity.rs — Non-bypassable hash verification.
//!
//! This is the Rust integrity boundary. Python may request checks,
//! but only Rust asserts truth. This module cannot be bypassed.

use sha2::{Digest, Sha256};
use std::fs;
use std::path::Path;

/// Result of an integrity check.
#[derive(Debug, serde::Serialize)]
pub struct IntegrityResult {
    pub path: String,
    pub expected_hash: String,
    pub actual_hash: String,
    pub valid: bool,
}

/// Compute SHA-256 of a file. Fails hard on I/O error.
pub fn sha256_file(path: &Path) -> Result<String, String> {
    let bytes = fs::read(path).map_err(|e| format!("Cannot read {}: {}", path.display(), e))?;
    let mut hasher = Sha256::new();
    hasher.update(&bytes);
    let result = hasher.finalize();
    Ok(hex::encode(result))
}

/// Compute SHA-256 of raw bytes.
pub fn sha256_bytes(data: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(data);
    hex::encode(hasher.finalize())
}

/// Verify a file against an expected SHA-256 hash.
/// Returns IntegrityResult; never silently passes.
pub fn verify_file(path: &Path, expected_hash: &str) -> Result<IntegrityResult, String> {
    let actual = sha256_file(path)?;
    let valid = actual == expected_hash.to_lowercase();

    Ok(IntegrityResult {
        path: path.display().to_string(),
        expected_hash: expected_hash.to_lowercase(),
        actual_hash: actual,
        valid,
    })
}

/// Verify a file against a .sha256 hash file.
/// Hash file format: "<hash>  <filename>" or just "<hash>"
pub fn verify_against_hash_file(
    artifact_path: &Path,
    hash_file_path: &Path,
) -> Result<IntegrityResult, String> {
    let hash_content = fs::read_to_string(hash_file_path)
        .map_err(|e| format!("Cannot read hash file {}: {}", hash_file_path.display(), e))?;

    let expected = hash_content
        .trim()
        .split_whitespace()
        .next()
        .ok_or_else(|| format!("Empty hash file: {}", hash_file_path.display()))?;

    verify_file(artifact_path, expected)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    #[test]
    fn test_sha256_bytes_known_value() {
        // SHA-256 of empty string
        let hash = sha256_bytes(b"");
        assert_eq!(
            hash,
            "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
        );
    }

    #[test]
    fn test_verify_file_pass() {
        let dir = std::env::temp_dir().join("genesis_test_pass");
        let _ = fs::create_dir_all(&dir);
        let file = dir.join("test.bin");
        let mut f = fs::File::create(&file).unwrap();
        f.write_all(b"hello genesis").unwrap();

        let expected = sha256_bytes(b"hello genesis");
        let result = verify_file(&file, &expected).unwrap();
        assert!(result.valid);

        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn test_verify_file_fail() {
        let dir = std::env::temp_dir().join("genesis_test_fail");
        let _ = fs::create_dir_all(&dir);
        let file = dir.join("test.bin");
        let mut f = fs::File::create(&file).unwrap();
        f.write_all(b"hello genesis").unwrap();

        let result = verify_file(&file, "0000000000000000000000000000000000000000000000000000000000000000").unwrap();
        assert!(!result.valid);

        let _ = fs::remove_dir_all(&dir);
    }
}
