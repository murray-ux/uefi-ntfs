# Firmware: Wind Turbine Sensor v0.1

## Identity
- **SYSTEM_ID**: UNNAMED-FW-WINDTURBINE-V0.1
- **OWNER_UID**: (set via config)
- **DEVICE**: Arduino (ATmega328P family)
- **HARDWARE_ROOT**: MSI Titan GT77HX (programming interface)

## Functional Specification

### setup()
- `Serial.begin(9600)` — 9600 baud data interface
- `analogReference(INTERNAL)` — Use 1.1V internal reference

### loop() (~10ms cycle)
- Sample AN0 (motor voltage) 99 times, track peak
- Read AN1 (current)
- Scale: 10-bit ADC (0-1023) -> 0-1100 mV
- Output: CSV format `{motor_voltage},{current_reading}\n`

## Memory Map (ATmega328P)

| Region | Start      | End        | Size  | Role                        | Access       |
|--------|------------|------------|-------|-----------------------------|--------------|
| BOOT   | 0x00000000 | 0x00000200 | 512B  | Reset vector + ISR table    | Execute-only |
| CODE   | 0x00000200 | 0x00007000 | 28KB  | Compiled Arduino sketch     | Execute/Read |
| CONST  | 0x00007000 | 0x00007800 | 2KB   | Static strings + LUTs       | Read-only    |
| EEPROM | 0x00001000 | 0x00001400 | 1KB   | Sensor calibration + config | R/W          |
| SRAM   | 0x00100000 | 0x00100900 | 2KB   | Stack + heap + globals      | R/W volatile |

## Safety Profile
- Read-only sensor input (no actuation)
- Serial-only interface (no network)
- No self-modifying code
- Deterministic timing (~99ms + transmission)
