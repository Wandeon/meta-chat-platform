# Documentation Changelog

All notable changes to Meta Chat Platform documentation.

## [2025-11-18] - Major Reorganization

### Overview
Complete documentation refresh with new organizational structure, comprehensive content updates, and archival of legacy documentation.

### Added
- **Master Index**: New docs/README.md with complete navigation structure
- **Feature Documentation**:
  - RAG System guide with latest improvements (ragTemplates.ts, quality-based prompting)
  - Confidence Escalation system documentation
  - MCP Integration guide with per-tenant credentials
  - Channels documentation (WhatsApp, Messenger, WebChat)
- **Deployment Guides**:
  - Production deployment on VPS-00 (chat.genai.hr)
  - Development setup guide
  - Infrastructure documentation
- **API Reference**:
  - Complete REST endpoints documentation
  - Authentication & security guide
- **Architecture Documentation**:
  - System design overview
  - Component architecture details
- **Operations Guides**:
  - Monitoring & observability
  - Troubleshooting procedures
  - Maintenance routines

### Changed
- **Organization**: Migrated from flat structure to feature-based hierarchy
- **Structure**: New docs/current/ directory for all active documentation
- **Format**: Standardized template across all documents with status badges
- **Cross-references**: Updated all internal links to new structure

### Archived
- All pre-2025-11-18 documentation moved to docs/archive/2025-11-18-pre-reorganization/
- Archived by category: deployment, features, api, misc
- Duplicate files identified and documented
- Archive README.md created for navigation

### Improved
- **RAG System**: Documented new ragTemplates.ts quality-based prompting (deployed 2025-11-18)
- **Consistency**: All docs follow standard template with metadata
- **Navigation**: Clear category-based structure
- **Completeness**: Full coverage of deployed features on VPS-00

### Technical Details
- 15 new documentation files created
- Legacy docs archived (20+ files)
- 10 parallel agents used for creation
- Git history preserved via archival strategy

## Future Updates

Document changes here following this format:

### [YYYY-MM-DD] - Brief Description

#### Added
- New features documented

#### Changed
- Updated documentation

#### Fixed
- Corrected errors or outdated information

#### Deprecated
- Documentation marked for removal
