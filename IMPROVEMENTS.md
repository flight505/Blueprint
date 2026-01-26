# Blueprint v1.0.x Improvements

Tracking bug fixes, polish, and feature extensions before v1.1/v2.0.

---

## Status Legend
- ⬚ Todo
- 🔄 In Progress
- ✅ Complete

---

## Bug Fixes

| ID | Description | Priority | Status |
|----|-------------|----------|--------|
| BF-001 | | | ⬚ |

---

## UI/UX Polish

| ID | Description | Priority | Status |
|----|-------------|----------|--------|
| UX-001 | macOS title bar and window dragging | High | ✅ |
| UX-002 | | | ⬚ |

---

## Feature Extensions

| ID | Description | Priority | Status |
|----|-------------|----------|--------|
| FE-001 | | | ⬚ |

---

## Performance

| ID | Description | Priority | Status |
|----|-------------|----------|--------|
| PF-001 | | | ⬚ |

---

## Technical Debt

| ID | Description | Priority | Status |
|----|-------------|----------|--------|
| TD-001 | Remove unused variables (setExportSections, initializeAgent, createSession) | Low | ⬚ |
| TD-002 | Fix KaTeX font resolution warnings during build | Low | ⬚ |

---

## Security Hardening

| ID | Description | Priority | Status |
|----|-------------|----------|--------|
| SH-001 | Path traversal protection in FileSystemService | High | ✅ |
| SH-002 | IPC input validation | High | ✅ |
| SH-003 | Content Security Policy headers | High | ✅ |
| SH-004 | Secure API key storage with encryption | High | ✅ |

---

## Documentation

| ID | Description | Priority | Status |
|----|-------------|----------|--------|
| DC-001 | Create CLAUDE.md project configuration | Medium | ✅ |
| DC-002 | | | ⬚ |

---

## Notes

### Adding Items
Use the next available ID in each category (e.g., BF-002, UX-003).

### Priority Levels
- **Critical** - Blocks usage, data loss risk
- **High** - Significant impact on UX or security
- **Medium** - Nice to have, improves experience
- **Low** - Minor polish, technical cleanup

### Completed Items Archive
Items marked ✅ can be moved here after release:

#### v1.0.1 (pending)
- UX-001: macOS title bar and window dragging
- SH-001-004: Security hardening (path validation, IPC validation, CSP, encryption)
- DC-001: CLAUDE.md documentation
