const COMMENT_MARKER = "<!-- ai-code-review:sticky -->";

const LABELS = {
  passed: {
    name: "ai-cr:passed",
    color: "2ea44f",
    description: "AI code review passed.",
  },
  failed: {
    name: "ai-cr:failed",
    color: "d73a4a",
    description: "AI code review failed or could not complete.",
  },
  review: {
    name: "ai-cr:review",
    color: "6f42c1",
    description: "Request a new AI code review run.",
  },
};

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name) {
  const value = process.env[name];
  return value && value.trim() ? value : undefined;
}

function parseRepository(repository) {
  const [owner, repo] = repository.split("/");
  if (!owner || !repo) {
    throw new Error(`Invalid GITHUB_REPOSITORY value: ${repository}`);
  }
  return { owner, repo };
}

function parseReviewJson(reviewJson) {
  if (!reviewJson) {
    return undefined;
  }
  return JSON.parse(reviewJson);
}

export function resolveReviewState({ reviewFailed, reviewSkipped, reviewVerdict, reviewSummary, reviewJson }) {
  if (reviewSkipped === "true") {
    return {
      verdict: "pass",
      label: LABELS.passed.name,
      removeLabel: LABELS.failed.name,
      summary: "No TypeScript changes were detected, so the AI model was not called.",
      review: undefined,
      skipped: true,
      failed: false,
    };
  }

  if (reviewFailed === "true") {
    return {
      verdict: "fail",
      label: LABELS.failed.name,
      removeLabel: LABELS.passed.name,
      summary: reviewSummary ?? "AI review failed before producing a structured result.",
      review: undefined,
      skipped: false,
      failed: true,
    };
  }

  const review = parseReviewJson(reviewJson);
  const verdict = reviewVerdict ?? review?.verdict;
  if (verdict !== "pass" && verdict !== "fail") {
    throw new Error(`Invalid review verdict: ${verdict ?? "<missing>"}`);
  }

  return {
    verdict,
    label: verdict === "pass" ? LABELS.passed.name : LABELS.failed.name,
    removeLabel: verdict === "pass" ? LABELS.failed.name : LABELS.passed.name,
    summary: reviewSummary ?? review?.summary ?? "No summary returned.",
    review,
    skipped: false,
    failed: false,
  };
}

function scoreRows(review) {
  if (!review) {
    return "";
  }

  return `\n| Criterion | Score |\n| --- | ---: |\n| Implementation correctness | ${review.implementationCorrectness}/10 |\n| Idiomaticity | ${review.idiomaticity}/10 |\n| Complexity | ${review.complexity}/10 |\n| Test risk coverage | ${review.testRiskCoverage}/10 |\n| Security/safety | ${review.securitySafety}/10 |\n`;
}

export function renderReviewComment(state) {
  const heading = state.skipped
    ? "## AI Code Review: skipped"
    : state.failed
      ? "## AI Code Review: failed to run"
      : `## AI Code Review: ${state.verdict}`;

  const scores = scoreRows(state.review);
  const details = state.failed
    ? "The workflow could not produce a structured AI review. Check the workflow logs for provider or prompt errors."
    : state.skipped
      ? "This PR did not include `.ts` or `.tsx` changes."
      : state.summary;

  return `${COMMENT_MARKER}\n${heading}\n\n**Verdict label:** \`${state.label}\`\n${scores}\n### Summary\n\n${details}\n`;
}

async function request({ token, method = "GET", path, body }) {
  const response = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (response.status === 204) {
    return undefined;
  }

  const text = await response.text();
  const data = text ? JSON.parse(text) : undefined;

  if (!response.ok) {
    const message = data?.message ?? response.statusText;
    const error = new Error(`${method} ${path} failed: ${response.status} ${message}`);
    error.status = response.status;
    throw error;
  }

  return data;
}

async function ensureLabel({ token, owner, repo, label }) {
  try {
    await request({ token, path: `/repos/${owner}/${repo}/labels/${encodeURIComponent(label.name)}` });
  } catch (error) {
    if (error.status !== 404) {
      throw error;
    }
    await request({
      token,
      method: "POST",
      path: `/repos/${owner}/${repo}/labels`,
      body: label,
    });
  }
}

async function removeLabel({ token, owner, repo, issueNumber, labelName }) {
  try {
    await request({
      token,
      method: "DELETE",
      path: `/repos/${owner}/${repo}/issues/${issueNumber}/labels/${encodeURIComponent(labelName)}`,
    });
  } catch (error) {
    if (error.status !== 404) {
      throw error;
    }
  }
}

async function addLabel({ token, owner, repo, issueNumber, labelName }) {
  await request({
    token,
    method: "POST",
    path: `/repos/${owner}/${repo}/issues/${issueNumber}/labels`,
    body: { labels: [labelName] },
  });
}

async function upsertComment({ token, owner, repo, issueNumber, body }) {
  const comments = await request({
    token,
    path: `/repos/${owner}/${repo}/issues/${issueNumber}/comments?per_page=100`,
  });
  const existing = comments.find((comment) => comment.user?.type === "Bot" && comment.body?.includes(COMMENT_MARKER));

  if (existing) {
    await request({
      token,
      method: "PATCH",
      path: `/repos/${owner}/${repo}/issues/comments/${existing.id}`,
      body: { body },
    });
    return;
  }

  await request({
    token,
    method: "POST",
    path: `/repos/${owner}/${repo}/issues/${issueNumber}/comments`,
    body: { body },
  });
}

async function main() {
  const token = requireEnv("GITHUB_TOKEN");
  const { owner, repo } = parseRepository(requireEnv("GITHUB_REPOSITORY"));
  const issueNumber = Number.parseInt(requireEnv("PR_NUMBER"), 10);
  if (!Number.isInteger(issueNumber)) {
    throw new Error(`Invalid PR_NUMBER value: ${process.env.PR_NUMBER}`);
  }

  const state = resolveReviewState({
    reviewFailed: optionalEnv("REVIEW_FAILED"),
    reviewSkipped: optionalEnv("REVIEW_SKIPPED"),
    reviewVerdict: optionalEnv("REVIEW_VERDICT"),
    reviewSummary: optionalEnv("REVIEW_SUMMARY"),
    reviewJson: optionalEnv("REVIEW_JSON"),
  });

  for (const label of Object.values(LABELS)) {
    await ensureLabel({ token, owner, repo, label });
  }

  await removeLabel({ token, owner, repo, issueNumber, labelName: state.removeLabel });
  await addLabel({ token, owner, repo, issueNumber, labelName: state.label });
  await removeLabel({ token, owner, repo, issueNumber, labelName: LABELS.review.name });
  await upsertComment({ token, owner, repo, issueNumber, body: renderReviewComment(state) });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
