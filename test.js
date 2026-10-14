// test.js
// Prove the service is single-use under concurrency.
import assert from "node:assert/strict";
import { issueToken, consumeToken, closeRedis } from "./token-service.js";

async function main() {
  try {
    const payload = { userId: 42 };
    const id = await issueToken(payload, 60);
    console.log("issued token:", id);

    // All five consumers race on the same token.
    const results = await Promise.all([
      consumeToken(id),
      consumeToken(id),
      consumeToken(id),
      consumeToken(id),
      consumeToken(id),
    ]);

    const winners = results.filter((result) => result.ok).length;
    console.log("winners:", winners);
    assert.equal(winners, 1, `Expected exactly one winner, got ${winners}`);

    const winner = results.find((result) => result.ok);
    assert.deepEqual(winner.payload, payload);
    assert.equal(
      results.filter((result) => !result.ok && result.reason === "invalid").length,
      4,
      "The other four consumers should receive an invalid result",
    );

    console.log("PASS: token was single-use.");
  } finally {
    await closeRedis();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
