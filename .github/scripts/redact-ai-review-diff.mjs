import { readFileSync, writeFileSync } from "node:fs";

const SECRET_PATTERNS = [
  /(OPENROUTER_API_KEY\s*[=:]\s*)[^\s'"]+/gi,
  /(SUPABASE_(?:URL|KEY)\s*[=:]\s*)[^\s'"]+/gi,
  /(CLOUDFLARE_(?:ACCOUNT_ID|API_TOKEN)\s*[=:]\s*)[^\s'"]+/gi,
  /((?:api[_-]?key|token|secret|password)\s*[=:]\s*)[^\s'"]+/gi,
  /sk-[A-Za-z0-9_-]{16,}/g,
  /gh[pousr]_[A-Za-z0-9_]{16,}/g,
];

export function redactDiff(diff) {
  let redacted = diff;
  let replacementCount = 0;

  for (const pattern of SECRET_PATTERNS) {
    redacted = redacted.replace(pattern, (...args) => {
      const matchedText = String(args[0]);
      if (matchedText.includes("[REDACTED]")) {
        return matchedText;
      }

      replacementCount += 1;
      const firstGroup = typeof args[1] === "string" ? args[1] : undefined;
      return firstGroup ? `${firstGroup}[REDACTED]` : "[REDACTED]";
    });
  }

  return { redacted, replacementCount };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [inputPath, outputPath] = process.argv.slice(2);
  if (!inputPath || !outputPath) {
    throw new Error("Usage: node redact-ai-review-diff.mjs <input> <output>");
  }

  const diff = readFileSync(inputPath, "utf8");
  const { redacted, replacementCount } = redactDiff(diff);
  writeFileSync(outputPath, redacted);

  if (replacementCount > 0) {
    console.log(`::warning::Redacted ${replacementCount} potential secret value(s) before AI review.`);
  }
}
