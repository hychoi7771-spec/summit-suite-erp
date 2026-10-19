# Architecture rules

- Shared navigation uses the decorative NavGlyph SVG component and semantic CSS tokens; this keeps interaction artwork consistent without changing link names or permissions.
- Shared button SVG feedback is decorative and pointer-triggered, with reduced-motion overrides; this preserves existing actions and accessible labels.
- Expense row and receipt access share database-enforced visibility rules; the private receipts bucket issues signed URLs only for authorized audiences, so exports and direct file access cannot bypass confidential settings.