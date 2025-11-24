# Pull Request Description

## Title

```
feat: Add dynamic maintenance module for test case maintenance
```

## Description

```markdown
## Feature Overview

Implemented a dynamic maintenance module that monitors code changes in real-time (based on Git), automatically identifies affected test cases, and provides batch fixing functionality.

## Main Features

### 1. Git Commit Monitoring and Diff Analysis
- ✅ Automatically detect Git commit changes (compare with previous commit)
- ✅ Extract code diff information
- ✅ Identify changed files and functions
- ✅ Calculate change statistics (lines added/removed, etc.)

### 2. Affected Test Case Identification
- ✅ Call backend API to identify affected test cases
- ✅ Display impact level (critical/high/medium/low)
- ✅ Provide impact reason descriptions
- ✅ Tree view to display affected tests

### 3. Batch Fix Functionality
- ✅ Execute corresponding operations based on user decision
- ✅ Functionality changed: Regenerate test cases
- ✅ Refactoring only: Improve test coverage
- ✅ Support selecting multiple test cases for batch processing

### 4. UI Interface and Interactions
- ✅ Activity Bar view container
- ✅ Tree view to display analysis results
- ✅ Code diff viewer (using VSCode built-in diff editor)
- ✅ Decision dialog (ask user if functionality has changed)
- ✅ Progress indicators and error handling

## Technical Implementation

### Directory Structure
```
src/maintenance/
├── api/                    # Backend API client
│   ├── maintenanceClient.ts
│   └── types.ts
├── git/                    # Git operations
│   ├── commitWatcher.ts    # Commit monitoring
│   └── diffAnalyzer.ts     # Diff analysis
├── ui/                     # UI components
│   ├── maintenanceTreeProvider.ts
│   ├── diffViewer.ts
│   └── decisionDialog.ts
├── commands/               # Command handlers
│   ├── analyzeMaintenance.ts
│   └── batchFix.ts
└── models/                 # Data models
    └── types.ts
```

### Core Workflow

1. **Analysis Workflow**:
   - Detect Git commit → Extract code diff → Call backend API → Display results → User decision

2. **Fix Workflow**:
   - User selects decision → Select test cases → Call backend API → Batch fix → Display results

## Configuration Options

The following configurations have been added to `package.json`:

- `llt-assistant.maintenance.backendUrl`: Backend API URL (default: `https://cs5351.efan.dev/api/v1`)
- `llt-assistant.maintenance.autoAnalyze`: Auto-analyze new commits (default: false)
- `llt-assistant.maintenance.watchCommits`: Watch Git commits (default: true)

## Backend API Interfaces

### Required Endpoints

1. **POST `/maintenance/analyze`**
   - Analyze affected test cases
   - Request: commit hash, code change information
   - Response: affected test list, change summary

2. **POST `/maintenance/batch-fix`**
   - Batch fix test cases
   - Request: action type, test list, user description
   - Response: fix results

3. **GET `/health`** (Optional)
   - Health check
   - If not implemented, will show warning but allow continuation

## Current Status

- ✅ Frontend code completed and tested
- ✅ Synced latest code from upstream/main
- ✅ Error handling implemented (404 error prompts)
- ⏳ Waiting for backend API endpoints to be implemented

## Issue Notes

- **Backend returns 404**: `/maintenance/analyze` and `/maintenance/batch-fix` endpoints are not yet implemented
- Frontend has complete error handling and user prompts
- Waiting for backend team to implement interfaces for full testing

## Testing Recommendations

1. Ensure backend API endpoints are implemented
2. Test in a Git repository containing test files
3. Requires at least 2 Git commits for comparison analysis

## Related Files

- `src/maintenance/` - Maintenance module core code
- `package.json` - Commands, views, configuration definitions
- `src/extension.ts` - Module registration and integration
- `docs/maintenance/` - Detailed documentation

## Checklist

- [x] Code synced from upstream/main
- [x] All changes committed
- [x] Code pushed to fork
- [x] No compilation errors
- [x] Error handling implemented
- [ ] Backend API endpoints pending implementation
- [ ] Full functionality testing pending backend support

---

**Note**: This PR contains frontend implementation and requires backend API support to run fully.
```
