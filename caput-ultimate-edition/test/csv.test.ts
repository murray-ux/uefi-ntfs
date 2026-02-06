// test/csv.test.ts
//
// Shared CSV parser — unit tests
//
// Run: npx tsx --test test/csv.test.ts
//
// Copyright (c) 2025 MuzzL3d Dictionary Contributors — Apache-2.0

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseCsv, extractField } from "../src/util/csv";

describe("parseCsv", () => {
  it("should parse simple CSV", () => {
    const csv = "Name,Age,City\nAlice,30,Sydney\nBob,25,Melbourne\n";
    const records = parseCsv(csv);
    assert.equal(records.length, 2);
    assert.equal(records[0]["Name"], "Alice");
    assert.equal(records[1]["Age"], "25");
  });

  it("should handle quoted fields with commas", () => {
    const csv = 'Name,Description\n"Smith, J","A person, notable"\n';
    const records = parseCsv(csv);
    assert.equal(records.length, 1);
    assert.equal(records[0]["Name"], "Smith, J");
    assert.equal(records[0]["Description"], "A person, notable");
  });

  it("should handle empty input", () => {
    const records = parseCsv("");
    assert.equal(records.length, 0);
  });

  it("should handle header-only input", () => {
    const records = parseCsv("A,B,C\n");
    assert.equal(records.length, 0);
  });

  it("should handle tab-separated values", () => {
    const csv = "Name\tAge\nAlice\t30\n";
    const records = parseCsv(csv);
    assert.equal(records.length, 1);
    assert.equal(records[0]["Name"], "Alice");
  });
});

describe("extractField", () => {
  it("should find field by alias", () => {
    const record = { "Application Name": "FooApp", "Company": "FooCo" };
    assert.equal(extractField(record, ["Application Name", "app_name"]), "FooApp");
  });

  it("should return fallback when not found", () => {
    const record = { "X": "1" };
    assert.equal(extractField(record, ["Y", "Z"], "default"), "default");
  });

  it("should return empty string when not found and no fallback", () => {
    const record = { "X": "1" };
    assert.equal(extractField(record, ["Y"]), "");
  });
});
