import "dotenv/config";

import { runCodeReviewerCli } from "./cli-runner.js";

process.exitCode = await runCodeReviewerCli({
  argv: process.argv.slice(2),
  envTitle: process.env.PR_TITLE,
  stdin: process.stdin as AsyncIterable<Buffer | string>,
});
