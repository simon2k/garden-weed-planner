import "dotenv/config";

import { reviewPullRequest } from "./index.js";
import { readStdin, readTitleArg } from "./cli-helpers.js";

const title = readTitleArg(process.argv.slice(2), process.env.PR_TITLE);
const diff = await readStdin(process.stdin as AsyncIterable<Buffer | string>);
const review = await reviewPullRequest({ title, diff });

console.log(JSON.stringify(review, null, 2));
