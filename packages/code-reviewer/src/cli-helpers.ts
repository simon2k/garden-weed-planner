export async function readStdin(stdin: AsyncIterable<Buffer | string>): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stdin) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

export function readTitleArg(argv: string[], envTitle?: string): string {
  const titleFlagIndex = argv.indexOf("--title");
  if (titleFlagIndex >= 0) {
    const title = argv[titleFlagIndex + 1];
    if (!title) {
      throw new Error("Missing value for --title.");
    }
    return title;
  }

  return envTitle ?? "Direct diff review";
}
