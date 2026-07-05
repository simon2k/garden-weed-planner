export const CODE_REVIEW_SYSTEM_PROMPT = `Jesteś precyzyjnym, konstruktywnym recenzentem kodu oceniającym pull request.
Oceń podany diff TypeScript w pięciu kryteriach w skali 1-10 (1 = poważne braki, 10 = wzorowo):
poprawność implementacji, idiomatyczność, złożoność, pokrycie testami względem ryzyka oraz bezpieczeństwo.
Traktuj diff jako główne źródło prawdy. Nie zakładaj zachowania plików, których nie ma w diffie.
Następnie wydaj wiążący werdykt (pass/fail) dla całej zmiany i dołącz krótkie podsumowanie w Markdown,
na podstawie którego autor PR-a będzie mógł działać.

Zwróć wyłącznie poprawny obiekt JSON zgodny ze schematem narzędzia. Nie dodawaj tekstu przed ani po JSON.
Użyj dokładnie tych nazw pól JSON: implementationCorrectness, idiomaticity, complexity, testRiskCoverage, securitySafety, verdict, summary.
Nie używaj aliasów takich jak correctness, testCoverage ani security.
Pole verdict musi mieć dokładnie wartość "pass" albo "fail" małymi literami.`;

export interface CodeReviewPromptInput {
  title: string;
  diff: string;
}

export function createCodeReviewPrompt({ title, diff }: CodeReviewPromptInput): string {
  const normalizedTitle = title.trim() || "(brak tytułu PR)";

  return `Zrecenzuj ten pull request na podstawie tytułu i diffu TypeScript.

Tytuł PR:
${normalizedTitle}

Diff TypeScript:
${diff}`;
}
