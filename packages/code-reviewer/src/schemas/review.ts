import { z } from "zod";

export const ReviewSchema = z.object({
  implementationCorrectness: z
    .number()
    .describe("Poprawność implementacji: czy kod robi to, co deklaruje, w skali 1-10."),
  idiomaticity: z.number().describe("Idiomatyczność: zgodność z konwencjami języka, SDK i projektu, w skali 1-10."),
  complexity: z.number().describe("Złożoność: prostota i utrzymywalność rozwiązania względem problemu, w skali 1-10."),
  testRiskCoverage: z.number().describe("Pokrycie testami względem ryzyka zmienianych ścieżek, w skali 1-10."),
  securitySafety: z
    .number()
    .describe("Bezpieczeństwo: brak podatności, wycieków sekretów i niebezpiecznych operacji, w skali 1-10."),
  verdict: z.enum(["pass", "fail"]).describe("Wiążący werdykt dla całej zmiany."),
  summary: z.string().describe("Krótkie podsumowanie w Markdown z konkretną, możliwą do wykonania informacją zwrotną."),
});

export type CodeReview = z.infer<typeof ReviewSchema>;
