# Removed Tests Log

> Track tests that were intentionally deleted. Prevents accidental coverage regression.

| Date | Test ID | File | Reason | Replacement |
|------|---------|------|--------|-------------|
| — | — | — | No tests removed yet | — |

## Process

Before deleting a test:
1. Check if the REQ-ID it covers has other tests at the same or lower layer
2. If it is the only test for that REQ — do NOT delete, refactor instead
3. Document here with reason
4. Run RTM audit after deletion to verify no gaps
