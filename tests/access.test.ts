import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { validBasicCredential, isSameOriginWrite } from "../lib/access";

test("shared access accepts only the configured credential", async () => {
  const credential = "test-user:synthetic-password";
  const hash = createHash("sha256").update(credential).digest("hex");
  assert.equal(await validBasicCredential(`Basic ${btoa(credential)}`, hash), true);
  for (const header of [null, "Bearer token", "Basic %%%", `Basic ${btoa("test-user:wrong")}`, `Basic ${btoa("no-colon")}`]) {
    assert.equal(await validBasicCredential(header, hash), false);
  }
  assert.equal(await validBasicCredential(`Basic ${btoa(credential)}`, ""), false);
});

test("browser writes reject a different or opaque origin", () => {
  assert.equal(isSameOriginWrite("POST", "https://eco.example", "eco.example"), true);
  assert.equal(isSameOriginWrite("POST", "https://evil.example", "eco.example"), false);
  assert.equal(isSameOriginWrite("POST", "null", "eco.example"), false);
  assert.equal(isSameOriginWrite("POST", "invalid", "eco.example"), false);
  assert.equal(isSameOriginWrite("POST", null, "eco.example"), true);
});
