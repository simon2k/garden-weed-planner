import { z } from "zod";

const score = () => z.number().int().min(1).max(10);

export const ReviewSchema = z.object({
  implementationCorrectness: score().describe("Poprawność implementacji: czy kod robi to, co deklaruje, w skali 1-10."),
  idiomaticity: score().describe("Idiomatyczność: zgodność z konwencjami języka, SDK i projektu, w skali 1-10."),
  complexity: score().describe("Złożoność: prostota i utrzymywalność rozwiązania względem problemu, w skali 1-10."),
  testRiskCoverage: score().describe("Pokrycie testami względem ryzyka zmienianych ścieżek, w skali 1-10."),
  securitySafety: score().describe(
    "Bezpieczeństwo: brak podatności, wycieków sekretów i niebezpiecznych operacji, w skali 1-10.",
  ),
  verdict: z.enum(["pass", "fail"]).describe("Wiążący werdykt dla całej zmiany."),
  summary: z.string().describe("Krótkie podsumowanie w Markdown z konkretną, możliwą do wykonania informacją zwrotną."),
});

export type CodeReview = z.infer<typeof ReviewSchema>;
