//! genesis-verify — CLI entry point for the Rust integrity boundary.
//!
//! Usage:
//!   genesis-verify hash <file>
//!   genesis-verify check <file> <expected_sha256>
//!   genesis-verify firmware <hex_file> [expected_sha256]

mod fw_check;
mod integrity;

use std::path::Path;
use std::process;

fn print_usage() {
    eprintln!("genesis-verify — GENESIS Rust Integrity Boundary");
    eprintln!();
    eprintln!("Usage:");
    eprintln!("  genesis-verify hash <file>                      Compute SHA-256");
    eprintln!("  genesis-verify check <file> <expected_sha256>   Verify file hash");
    eprintln!("  genesis-verify firmware <hex> [expected_sha256]  Validate Intel HEX firmware");
    process::exit(1);
}

fn main() {
    let args: Vec<String> = std::env::args().collect();

    if args.len() < 3 {
        print_usage();
    }

    let command = &args[1];
    let path = Path::new(&args[2]);

    match command.as_str() {
        "hash" => {
            match integrity::sha256_file(path) {
                Ok(hash) => {
                    println!("{}  {}", hash, path.display());
                }
                Err(e) => {
                    eprintln!("FAIL: {}", e);
                    process::exit(1);
                }
            }
        }

        "check" => {
            if args.len() < 4 {
                eprintln!("Missing expected hash argument");
                process::exit(1);
            }
            let expected = &args[3];
            match integrity::verify_file(path, expected) {
                Ok(result) => {
                    let json = serde_json::to_string_pretty(&result).unwrap();
                    println!("{}", json);
                    if !result.valid {
                        process::exit(1);
                    }
                }
                Err(e) => {
                    eprintln!("FAIL: {}", e);
                    process::exit(1);
                }
            }
        }

        "firmware" => {
            let expected = args.get(3).map(|s| s.as_str());
            match fw_check::validate_firmware(path, expected) {
                Ok(hash) => {
                    println!("PASS: {} (sha256: {})", path.display(), hash);
                }
                Err(e) => {
                    eprintln!("FAIL: {}", e);
                    process::exit(1);
                }
            }
        }

        _ => print_usage(),
    }
}
