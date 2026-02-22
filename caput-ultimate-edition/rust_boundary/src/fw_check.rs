//! fw_check.rs — Intel HEX firmware validation (fail-closed).
//!
//! Validates:
//!   1. Intel HEX record syntax
//!   2. Per-record 8-bit checksums
//!   3. Address boundaries (ATmega328P: 0x0000–0x8000)
//!   4. Whole-image SHA-256

use crate::integrity;
use std::fs;
use std::path::Path;

const FLASH_LIMIT: u32 = 0x8000; // 32KB ATmega328P flash

/// A parsed Intel HEX record.
#[derive(Debug)]
struct HexRecord {
    byte_count: u8,
    address: u16,
    record_type: u8,
    data: Vec<u8>,
    checksum: u8,
    line_number: usize,
}

/// Parse a single Intel HEX line. Returns Err on syntax failure.
fn parse_hex_line(line: &str, line_number: usize) -> Result<HexRecord, String> {
    let line = line.trim();
    if !line.starts_with(':') {
        return Err(format!("Line {}: missing start code ':'", line_number));
    }

    let hex_str = &line[1..];
    if hex_str.len() < 10 {
        return Err(format!("Line {}: too short", line_number));
    }

    let bytes: Vec<u8> = (0..hex_str.len())
        .step_by(2)
        .map(|i| u8::from_str_radix(&hex_str[i..i + 2], 16))
        .collect::<Result<Vec<u8>, _>>()
        .map_err(|e| format!("Line {}: invalid hex: {}", line_number, e))?;

    let byte_count = bytes[0];
    let address = ((bytes[1] as u16) << 8) | (bytes[2] as u16);
    let record_type = bytes[3];
    let data = bytes[4..bytes.len() - 1].to_vec();
    let checksum = *bytes.last().unwrap();

    // Verify data length matches byte_count
    if data.len() != byte_count as usize {
        return Err(format!(
            "Line {}: byte count {} but {} data bytes",
            line_number,
            byte_count,
            data.len()
        ));
    }

    Ok(HexRecord {
        byte_count,
        address,
        record_type,
        data,
        checksum,
        line_number,
    })
}

/// Gate 1: Verify per-record 8-bit two's complement checksum.
fn verify_checksum(record: &HexRecord) -> Result<(), String> {
    let mut sum: u8 = 0;
    sum = sum.wrapping_add(record.byte_count);
    sum = sum.wrapping_add((record.address >> 8) as u8);
    sum = sum.wrapping_add((record.address & 0xFF) as u8);
    sum = sum.wrapping_add(record.record_type);
    for &b in &record.data {
        sum = sum.wrapping_add(b);
    }
    let expected = (!sum).wrapping_add(1);

    if expected != record.checksum {
        return Err(format!(
            "Line {}: checksum mismatch (expected 0x{:02X}, got 0x{:02X})",
            record.line_number, expected, record.checksum
        ));
    }
    Ok(())
}

/// Gate 2: Verify address is within ATmega328P flash bounds.
fn verify_address(record: &HexRecord) -> Result<(), String> {
    if record.record_type != 0x00 {
        return Ok(()); // Only check data records
    }
    let end_addr = record.address as u32 + record.byte_count as u32;
    if end_addr > FLASH_LIMIT {
        return Err(format!(
            "Line {}: address 0x{:04X}+{} exceeds flash limit 0x{:04X}",
            record.line_number, record.address, record.byte_count, FLASH_LIMIT
        ));
    }
    Ok(())
}

/// Full firmware validation. Returns Ok(hash) or Err on any gate failure.
pub fn validate_firmware(hex_path: &Path, expected_hash: Option<&str>) -> Result<String, String> {
    let content =
        fs::read_to_string(hex_path).map_err(|e| format!("Cannot read {}: {}", hex_path.display(), e))?;

    let mut record_count: usize = 0;

    for (i, line) in content.lines().enumerate() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }

        let record = parse_hex_line(line, i + 1)?;

        // Gate 1: checksum
        verify_checksum(&record)?;

        // Gate 2: address bounds
        verify_address(&record)?;

        record_count += 1;
    }

    if record_count == 0 {
        return Err("No records found in hex file".to_string());
    }

    // Gate 3: whole-image SHA-256
    let actual_hash = integrity::sha256_file(hex_path)?;

    if let Some(expected) = expected_hash {
        if actual_hash != expected.to_lowercase() {
            return Err(format!(
                "SHA-256 mismatch: expected {}, got {}",
                expected, actual_hash
            ));
        }
    }

    Ok(actual_hash)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_valid_eof_record() {
        let record = parse_hex_line(":00000001FF", 1).unwrap();
        assert_eq!(record.record_type, 0x01);
        assert_eq!(record.byte_count, 0);
    }

    #[test]
    fn test_checksum_eof_record() {
        let record = parse_hex_line(":00000001FF", 1).unwrap();
        assert!(verify_checksum(&record).is_ok());
    }

    #[test]
    fn test_bad_checksum() {
        let record = parse_hex_line(":00000001FE", 1).unwrap();
        assert!(verify_checksum(&record).is_err());
    }
}
