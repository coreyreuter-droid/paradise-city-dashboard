import { rateLimit } from "@/lib/rateLimit";

describe("rateLimit (in-memory)", () => {
  beforeEach(() => {
    // Clear any state between tests by using unique keys
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("allows requests under the limit", () => {
    const key = `test-${Date.now()}-1`;
    
    const result1 = rateLimit(key, 3, 60000);
    expect(result1.allowed).toBe(true);
    expect(result1.remaining).toBe(2);

    const result2 = rateLimit(key, 3, 60000);
    expect(result2.allowed).toBe(true);
    expect(result2.remaining).toBe(1);

    const result3 = rateLimit(key, 3, 60000);
    expect(result3.allowed).toBe(true);
    expect(result3.remaining).toBe(0);
  });

  it("blocks requests over the limit", () => {
    const key = `test-${Date.now()}-2`;
    
    // Use up the limit
    rateLimit(key, 2, 60000);
    rateLimit(key, 2, 60000);

    // This should be blocked
    const result = rateLimit(key, 2, 60000);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("resets after window expires", () => {
    const key = `test-${Date.now()}-3`;
    const windowMs = 60000;

    // Use up the limit
    rateLimit(key, 1, windowMs);
    
    const blocked = rateLimit(key, 1, windowMs);
    expect(blocked.allowed).toBe(false);

    // Advance time past the window
    jest.advanceTimersByTime(windowMs + 1000);

    // Should be allowed again
    const result = rateLimit(key, 1, windowMs);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(0);
  });

  it("tracks different keys independently", () => {
    const key1 = `test-${Date.now()}-4a`;
    const key2 = `test-${Date.now()}-4b`;

    // Use up limit for key1
    rateLimit(key1, 1, 60000);
    const blocked = rateLimit(key1, 1, 60000);
    expect(blocked.allowed).toBe(false);

    // key2 should still be allowed
    const result = rateLimit(key2, 1, 60000);
    expect(result.allowed).toBe(true);
  });

  it("returns correct resetInSeconds", () => {
    const key = `test-${Date.now()}-5`;
    const windowMs = 3600000; // 1 hour

    const result = rateLimit(key, 10, windowMs);
    expect(result.resetInSeconds).toBe(3600);
  });
});
