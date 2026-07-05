import { readFileSync, writeFileSync } from "node:fs";

const STANDALONE_SECRET_PATTERNS = [/sk-[A-Za-z0-9_-]{16,}/g, /gh[pousr]_[A-Za-z0-9_]{16,}/g];

const ASSIGNMENT_PATTERN =
  /\b([A-Z][A-Z0-9_]*(?:KEY|TOKEN|SECRET|PASSWORD)|(?:api[_-]?key|token|secret|password))\s*[=:]\s*(["']?)([^\s"';]+)\2/gi;

function looksLikeSecretValue(value) {
  if (/^(?:true|false|null|undefined|previous)$/i.test(value)) {
    return false;
  }

  if (/^(?:process\.env\.|import\.meta\.|apiKey$|resolvedApiKey$|requireApiKey$)/.test(value)) {
    return false;
  }

  return value.length >= 12 || /^(?:sk-|gh[pousr]_)/.test(value);
}

export function redactDiff(diff) {
  let redacted = diff;
  let replacementCount = 0;

  for (const pattern of STANDALONE_SECRET_PATTERNS) {
    redacted = redacted.replace(pattern, (matchedText) => {
      if (matchedText.includes("[REDACTED]")) {
        return matchedText;
      }

      replacementCount += 1;
      return "[REDACTED]";
    });
  }

  redacted = redacted.replace(ASSIGNMENT_PATTERN, (matchedText, key, quote, value) => {
    if (matchedText.includes("[REDACTED]") || !looksLikeSecretValue(value)) {
      return matchedText;
    }

    replacementCount += 1;
    return `${key}=${quote}[REDACTED]${quote}`;
  });

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
