import "dotenv/config";

import { reviewCodeDiff } from "./src/index.js";

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin as AsyncIterable<Buffer | string>) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

const diff = await readStdin();
const review = await reviewCodeDiff(diff);
console.log(JSON.stringify(review, null, 2));
