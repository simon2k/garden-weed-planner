import { readStdin, readTitleArg } from "./cli-helpers.js";
import { reviewPullRequest, type ReviewPullRequestInput } from "./index.js";
import type { CodeReview } from "./schemas/review.js";

export interface CodeReviewerCliOptions {
  argv: string[];
  envTitle?: string;
  stdin: AsyncIterable<Buffer | string>;
  stdout?: Pick<NodeJS.WriteStream, "write">;
  stderr?: Pick<NodeJS.WriteStream, "write">;
  review?: (input: ReviewPullRequestInput) => Promise<CodeReview>;
}

export async function runCodeReviewerCli({
  argv,
  envTitle,
  stdin,
  stdout = process.stdout,
  stderr = process.stderr,
  review = reviewPullRequest,
}: CodeReviewerCliOptions): Promise<number> {
  try {
    const title = readTitleArg(argv, envTitle);
    const diff = await readStdin(stdin);
    const result = await review({ title, diff });
    stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown code review failure.";
    stderr.write(`AI code review failed: ${message}\n`);
    return 1;
  }
}
