import { parseCsv, parseCsvWithHeaders } from "@/lib/csvParser";

describe("parseCsv", () => {
  it("parses simple CSV", () => {
    const csv = "a,b,c\n1,2,3\n4,5,6";
    const result = parseCsv(csv);
    
    expect(result).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
      ["4", "5", "6"],
    ]);
  });

  it("handles quoted fields with commas", () => {
    const csv = 'name,address\n"Smith, John","123 Main St, Apt 4"';
    const result = parseCsv(csv);
    
    expect(result).toEqual([
      ["name", "address"],
      ["Smith, John", "123 Main St, Apt 4"],
    ]);
  });

  it("handles escaped quotes inside quoted fields", () => {
    const csv = 'quote\n"He said ""hello"""';
    const result = parseCsv(csv);
    
    expect(result).toEqual([
      ["quote"],
      ['He said "hello"'],
    ]);
  });

  it("handles empty fields", () => {
    const csv = "a,b,c\n1,,3\n,2,";
    const result = parseCsv(csv);
    
    expect(result).toEqual([
      ["a", "b", "c"],
      ["1", "", "3"],
      ["", "2", ""],
    ]);
  });

  it("handles mixed quoted and unquoted fields", () => {
    const csv = 'name,amount,note\nJohn,100,"Has, comma"\nJane,200,No comma';
    const result = parseCsv(csv);
    
    expect(result).toEqual([
      ["name", "amount", "note"],
      ["John", "100", "Has, comma"],
      ["Jane", "200", "No comma"],
    ]);
  });

  it("trims whitespace from fields", () => {
    const csv = "  a  ,  b  ,  c  \n  1  ,  2  ,  3  ";
    const result = parseCsv(csv);
    
    expect(result).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("handles Windows line endings (CRLF)", () => {
    const csv = "a,b,c\r\n1,2,3\r\n4,5,6";
    const result = parseCsv(csv);
    
    expect(result).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
      ["4", "5", "6"],
    ]);
  });

  it("handles old Mac line endings (CR)", () => {
    const csv = "a,b,c\r1,2,3\r4,5,6";
    const result = parseCsv(csv);
    
    expect(result).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
      ["4", "5", "6"],
    ]);
  });

  it("skips empty lines", () => {
    const csv = "a,b,c\n\n1,2,3\n\n4,5,6\n";
    const result = parseCsv(csv);
    
    expect(result).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
      ["4", "5", "6"],
    ]);
  });

  it("returns empty array for empty input", () => {
    expect(parseCsv("")).toEqual([]);
    expect(parseCsv("   ")).toEqual([]);
    expect(parseCsv("\n\n")).toEqual([]);
  });

  it("handles single row", () => {
    const csv = "a,b,c";
    const result = parseCsv(csv);
    
    expect(result).toEqual([["a", "b", "c"]]);
  });

  it("handles single column", () => {
    const csv = "header\nvalue1\nvalue2";
    const result = parseCsv(csv);
    
    expect(result).toEqual([
      ["header"],
      ["value1"],
      ["value2"],
    ]);
  });

  it("handles quoted fields with newlines inside", () => {
    const csv = 'name,note\nJohn,"Line 1\nLine 2"';
    const result = parseCsv(csv);
    
    expect(result).toEqual([
      ["name", "note"],
      ["John", "Line 1\nLine 2"],
    ]);
  });
});

describe("parseCsvWithHeaders", () => {
  it("separates headers from data rows", () => {
    const csv = "name,amount\nAlice,100\nBob,200";
    const result = parseCsvWithHeaders(csv);
    
    expect(result.headers).toEqual(["name", "amount"]);
    expect(result.rows).toEqual([
      ["Alice", "100"],
      ["Bob", "200"],
    ]);
  });

  it("returns empty arrays for empty input", () => {
    const result = parseCsvWithHeaders("");
    
    expect(result.headers).toEqual([]);
    expect(result.rows).toEqual([]);
  });

  it("handles header-only CSV", () => {
    const csv = "name,amount";
    const result = parseCsvWithHeaders(csv);
    
    expect(result.headers).toEqual(["name", "amount"]);
    expect(result.rows).toEqual([]);
  });
});

describe("parseCsv real-world scenarios", () => {
  it("handles typical budget CSV", () => {
    const csv = `fiscal_year,department_name,amount
2024,Police Department,1500000
2024,"Parks, Recreation & Culture",750000
2024,Fire Department,1200000`;
    
    const result = parseCsv(csv);
    
    expect(result).toEqual([
      ["fiscal_year", "department_name", "amount"],
      ["2024", "Police Department", "1500000"],
      ["2024", "Parks, Recreation & Culture", "750000"],
      ["2024", "Fire Department", "1200000"],
    ]);
  });

  it("handles vendor names with commas", () => {
    const csv = `date,vendor,amount
2024-01-15,"Smith, Jones & Associates",5000
2024-01-16,"ABC Company",3000`;
    
    const result = parseCsv(csv);
    
    expect(result[1][1]).toBe("Smith, Jones & Associates");
  });

  it("handles descriptions with special characters", () => {
    const csv = `description,amount
"Office supplies (pens, paper, etc.)",150
"Equipment ""upgrade"" project",5000`;
    
    const result = parseCsv(csv);
    
    expect(result[1][0]).toBe("Office supplies (pens, paper, etc.)");
    expect(result[2][0]).toBe('Equipment "upgrade" project');
  });
});
