import { describe, expect, it } from "vitest";
import { createSimpleToken, isAccountName } from "../server/_core/simpleAuth";

describe("simple login", () => {
  it("accepts only the two configured account names", () => {
    expect(isAccountName("Elzem")).toBe(true);
    expect(isAccountName("Jasgues")).toBe(true);
    expect(isAccountName("Google")).toBe(false);
  });

  it("creates stable tokens for both accounts", () => {
    expect(createSimpleToken("Elzem")).toBe("kalbim-simple-elzem");
    expect(createSimpleToken("Jasgues")).toBe("kalbim-simple-jasgues");
  });
});
