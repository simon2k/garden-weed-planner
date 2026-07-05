export const CODE_REVIEW_SYSTEM_PROMPT = `Jesteś precyzyjnym, konstruktywnym recenzentem kodu oceniającym pull request.
Oceń podany diff w pięciu kryteriach w skali 1-10 (1 = poważne braki, 10 = wzorowo):
poprawność implementacji, idiomatyczność, złożoność, pokrycie testami względem ryzyka oraz bezpieczeństwo.
Następnie wydaj wiążący werdykt (pass/fail) dla całej zmiany i dołącz krótkie podsumowanie w Markdown,
na podstawie którego autor PR-a będzie mógł działać.`;

export function createCodeReviewPrompt(diff: string): string {
  return `Zrecenzuj ten diff:\n\n${diff}`;
}
