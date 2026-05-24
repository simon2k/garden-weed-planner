---
project: "Garden Weed Planner"
version: 1
status: draft
created: 2026-05-21
context_type: greenfield
product_type: web-app
target_scale:
  users: small
  qps: low
  data_volume: small
timeline_budget:
  mvp_weeks: 3
  hard_deadline: null
  after_hours_only: true
---

# PRD — Garden Weed Planner

## Vision & Problem Statement

Osoba zarządzająca wieloma rabatami nie wie, które rabaty wymagają najpilniejszego pielenia, gdy planuje pracę w ogrodzie. Dziś musi ręcznie oceniać rabaty, przez co pilne miejsca mogą zostać pominięte albo czas pracy może zostać poświęcony mniej ważnym rabatom.

Insight: priorytet pielenia nie zależy tylko od daty ostatniego pielenia; trzeba łączyć datę, poziom zachwaszczenia, przewidywany czas pracy i ilość kory.

## User & Persona

Primary persona: jedna osoba zarządzająca wieloma rabatami w jednym ogrodzie lub obiekcie. Użytkownik potrzebuje szybkiej kolejki pracy pokazującej, które rabaty są OK, które wymagają działania wkrótce, a które są pilne.

## Success Criteria

### Primary
- Użytkownik może zalogować się, dodać kilka rabat z podstawowymi danymi i zobaczyć listę rabat uporządkowaną według priorytetu OK / wkrótce / pilne.
- Użytkownik wie, którą rabatę pielić jako pierwszą.

### Secondary
- Po wykonaniu pracy użytkownik może zresetować datę ostatniego pielenia, a priorytet rabaty spada.

### Guardrails
- Użytkownik widzi priorytet i sugerowaną datę kolejnego pielenia bez konieczności interpretowania surowych danych wejściowych.
- Dane rabat nie mogą mieszać się między użytkownikami: każdy zalogowany użytkownik widzi tylko swoje rabaty.

## User Stories

### US-01: Wyznaczenie priorytetu pielenia rabat

- **Given** zalogowany użytkownik ma co najmniej jedną rabatę z danymi o ostatnim pieleniu, zachwaszczeniu, czasie pracy, korze i obserwacjach chwastów
- **When** użytkownik otwiera listę rabat
- **Then** widzi rabaty uporządkowane według priorytetu OK / wkrótce / pilne

#### Acceptance Criteria
- Lista rabat pokazuje priorytet każdej rabaty jako OK, wkrótce albo pilne.
- Rabaty o wyższej pilności są prezentowane przed mniej pilnymi.

## Functional Requirements

- FR-001: Zalogowany użytkownik może dodać rabatę. Priority: must-have
  > Socrates: Counter-argument considered: "można zacząć od predefiniowanych rabat / importu testowego, żeby szybciej sprawdzić algorytm." Resolution: kept; dodawanie rabat jest konieczne, bo bez tego nie ma czego priorytetyzować.
- FR-002: Zalogowany użytkownik może podać powierzchnię rabaty. Priority: must-have
  > Socrates: Counter-argument considered: "powierzchnia może być niepotrzebna w MVP, jeśli priorytet zależy głównie od zachwaszczenia i ostatniego pielenia." Resolution: kept; powierzchnia wpływa na ocenę nakładu pracy.
- FR-003: Zalogowany użytkownik może prowadzić listę roślin posadzonych na rabacie. Priority: must-have
  > Socrates: Counter-argument considered: "lista roślin może być przydatna jako kontekst, ale niekoniecznie wpływa na decyzję co pielić teraz." Resolution: kept; lista roślin pomaga ocenić rabatę i ryzyko zachwaszczenia.
- FR-004: Zalogowany użytkownik może podać dla rabaty datę ostatniego pielenia, poziom zachwaszczenia, przewidywany czas pracy i ilość kory. Priority: must-have
  > Socrates: Counter-argument considered: "formularz może być za ciężki, jeśli użytkownik musi wpisać zbyt dużo danych przed zobaczeniem wartości." Resolution: kept; te dane są rdzeniem algorytmu priorytetu.
- FR-005: Zalogowany użytkownik może dodawać obserwacje chwastów zawierające typ chwastu, datę, poziom nasilenia lub pokrycia oraz notatkę. Priority: must-have
  > Socrates: Counter-argument considered: "obserwacje chwastów mogą rozbudować MVP i opóźnić pierwszą wersję." Resolution: kept; obserwacje wpływają na priorytet pielenia.
- FR-006: Zalogowany użytkownik może zobaczyć priorytet rabaty jako OK, wkrótce albo pilne oraz sugerowaną datę kolejnego pielenia. Priority: must-have
  > Socrates: Counter-argument considered: "trzy etykiety mogą być zbyt uproszczone, jeśli użytkownik potrzebuje dokładnej daty kolejnego pielenia." Resolution: revised; MVP pokazuje także sugerowaną datę kolejnego pielenia.
- FR-007: Zalogowany użytkownik może zobaczyć listę rabat uporządkowaną według pilności z widoczną sugerowaną datą kolejnego pielenia. Priority: must-have
  > Socrates: Counter-argument considered: "sama kolejność po pilności może być niewystarczająca, jeśli użytkownik planuje pracę według czasu pracy lub konkretnej daty." Resolution: revised; widok uwzględnia sugerowaną datę kolejnego pielenia.
- FR-008: Zalogowany użytkownik może oznaczyć rabatę jako wypieloną oraz zapisać czas pracy i notatkę. Priority: must-have
  > Socrates: Counter-argument considered: "samo oznaczenie jako wypielone może być za mało, jeśli użytkownik chce zapisać, kiedy i ile czasu zajęła praca." Resolution: revised; MVP zapisuje też czas pracy i notatkę.

## Non-Functional Requirements

- Dane rabat, obserwacji chwastów i historii pielenia jednego użytkownika nie są widoczne ani dostępne dla innych zalogowanych użytkowników.
- Po zmianie danych rabaty użytkownik widzi zaktualizowany priorytet i sugerowaną datę bez odczuwalnego opóźnienia.

## Business Logic

System wyznacza priorytet i datę kolejnego pielenia na podstawie czasu od ostatniego pielenia, poziomu zachwaszczenia, powierzchni, czasu pracy, ilości kory i obserwacji chwastów.

Obserwacje chwastów wpływają na priorytet przez poziom nasilenia lub pokrycia oraz przez typ chwastu. Większe nasilenie, większe pokrycie lub bardziej problematyczny typ chwastu zwiększają pilność rabaty.

Ilość kory działa jako czynnik obniżający pilność: większa ilość kory może przesuwać sugerowany termin kolejnego pielenia później.

## Access Control

Zalogowany użytkownik zarządza wyłącznie swoimi rabatami. MVP ma płaski model dostępu: brak ról admin/członek/gość i brak współdzielenia rabat między użytkownikami.

## Non-Goals

- Brak pracy zespołowej i przypisywania zadań — MVP obsługuje jednego użytkownika i jego rabaty.
- Brak zdjęć i rozpoznawania chwastów ze zdjęć — obserwacje chwastów są ręcznie wpisywane.
- Brak pełnego kalendarza zadań ogrodowych — system sugeruje termin pielenia, ale nie jest kompletnym plannerem ogrodu.

## Open Questions

Brak otwartych pytań na podstawie zaakceptowanego shape-notes.md.
