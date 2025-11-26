# Backend URL Configuration Audit & Redesign

## Current Status (PROBLEMATIC)

### Feature 1: Test Generation (F1)
- **Config Key**: `llt-assistant.backendUrl`
- **Default**: `https://cs5351.efan.dev`
- **Status**: ✅ Declared in package.json
- **Used By**: `src/services/ApiClient.ts`

### Feature 2: Quality Analysis
- **Config Key**: `llt-assistant.quality.backendUrl`
- **Default**: `http://localhost:8886`
- **Status**: ✅ Declared in package.json
- **Used By**: `src/quality/api/client.ts`

### Feature 2: Coverage Optimization
- **Config Key**: `llt-assistant.coverage.backendUrl` (attempted)
- **Default**: Falls back to `https://cs5351.efan.dev`
- **Status**: ❌ NOT declared in package.json
- **Used By**: `src/coverage/utils/config.ts`
- **Problem**: Reads from undefined config!

### Feature 3: Impact Analysis
- **Config Key**: `llt-assistant.backendUrl`
- **Default**: `https://cs5351.efan.dev`
- **Status**: ✅ Declared in package.json
- **Used By**: `src/impact/api/impactClient.ts`

---

## Problems

1. **Inconsistent Configuration**
   - F1 and F3 share `backendUrl`
   - F2 (Quality) uses separate `quality.backendUrl`
   - F2 (Coverage) tries to use undeclared `coverage.backendUrl`

2. **No Centralized Management**
   - User has to change URL in multiple places
   - Confusing for users: which config affects which feature?

3. **Missing Declaration**
   - Coverage feature reads config that doesn't exist in package.json
   - Falls back to hardcoded default

4. **User Pain Point**
   - User wants to switch all features to local dev: `http://localhost:8886`
   - Currently requires changing 2-3 different settings

---

## Proposed Solution: Unified Configuration

### Design Principles

1. **Single Source of Truth**: One main backend URL
2. **Feature-Specific Override**: Optional per-feature URLs for advanced users
3. **Clear Fallback Chain**: Explicit priority order
4. **Backward Compatible**: Don't break existing configurations

### New Configuration Structure

```json
{
  "llt-assistant.backendUrl": {
    "type": "string",
    "default": "http://localhost:8886",
    "description": "Default backend API URL for all features (Test Generation, Coverage, Impact)"
  },
  "llt-assistant.quality.backendUrl": {
    "type": "string",
    "default": "",
    "description": "Backend URL for Quality Analysis (overrides default if set, empty = use default)"
  },
  "llt-assistant.coverage.backendUrl": {
    "type": "string",
    "default": "",
    "description": "Backend URL for Coverage Analysis (overrides default if set, empty = use default)"
  },
  "llt-assistant.impact.backendUrl": {
    "type": "string",
    "default": "",
    "description": "Backend URL for Impact Analysis (overrides default if set, empty = use default)"
  }
}
```

### Fallback Logic

```typescript
// Pseudo code for each feature
function getBackendUrl(featureName: string): string {
    const config = vscode.workspace.getConfiguration('llt-assistant');

    // Try feature-specific URL first
    const featureUrl = config.get<string>(`${featureName}.backendUrl`);
    if (featureUrl && featureUrl.trim()) {
        return featureUrl;
    }

    // Fall back to main backend URL
    return config.get<string>('backendUrl', 'http://localhost:8886');
}
```

### Migration Path

**For Users:**
- **Simple Case**: Just set `llt-assistant.backendUrl` → all features use it
- **Advanced Case**: Override specific features with `llt-assistant.<feature>.backendUrl`

**For Development:**
- Local dev: Set `backendUrl` to `http://localhost:8886`
- Production: Set `backendUrl` to `https://cs5351.efan.dev`
- Mixed environment: Use feature-specific overrides

---

## Implementation Plan

### 1. Update package.json

```json
{
  "llt-assistant.backendUrl": {
    "default": "http://localhost:8886",  // ← Changed from prod to local
    "description": "Default backend API URL for all LLT features. Individual features can override this with feature-specific settings."
  },
  "llt-assistant.quality.backendUrl": {
    "default": "",  // ← Empty = use default
    "description": "Override backend URL for Quality Analysis (leave empty to use default)"
  },
  "llt-assistant.coverage.backendUrl": {  // ← NEW
    "default": "",
    "description": "Override backend URL for Coverage Optimization (leave empty to use default)"
  },
  "llt-assistant.impact.backendUrl": {  // ← NEW
    "default": "",
    "description": "Override backend URL for Impact Analysis (leave empty to use default)"
  }
}
```

### 2. Create Unified Config Utility

`src/utils/backendConfig.ts`:

```typescript
export class BackendConfigManager {
    /**
     * Get backend URL for a specific feature
     * Falls back to main backendUrl if feature-specific URL is not set
     */
    static getBackendUrl(featureName?: string): string {
        const config = vscode.workspace.getConfiguration('llt-assistant');

        // Try feature-specific URL if feature name provided
        if (featureName) {
            const featureUrl = config.get<string>(`${featureName}.backendUrl`, '');
            if (featureUrl && featureUrl.trim()) {
                console.log(`[LLT Config] Using ${featureName}-specific URL: ${featureUrl}`);
                return featureUrl;
            }
        }

        // Fall back to main backend URL
        const defaultUrl = config.get<string>('backendUrl', 'http://localhost:8886');
        console.log(`[LLT Config] Using default backend URL: ${defaultUrl}`);
        return defaultUrl;
    }
}
```

### 3. Update All Features

- **Quality**: `BackendConfigManager.getBackendUrl('quality')`
- **Coverage**: `BackendConfigManager.getBackendUrl('coverage')`
- **Impact**: `BackendConfigManager.getBackendUrl('impact')`
- **Test Gen**: `BackendConfigManager.getBackendUrl()` // uses default

---

## Benefits

1. ✅ **One-Click Switch**: Change `backendUrl` to switch all features
2. ✅ **Flexibility**: Advanced users can still use different URLs per feature
3. ✅ **Clarity**: Clear documentation of what each config does
4. ✅ **Fix Bug**: Coverage feature gets proper configuration
5. ✅ **Better UX**: Settings panel will show clear descriptions

---

## Testing Plan

1. **Default Behavior**: All features use `http://localhost:8886`
2. **Feature Override**: Set `quality.backendUrl` to different value, verify only Quality uses it
3. **Config Changes**: Change `backendUrl`, verify all features update
4. **Backward Compatibility**: Existing configs still work

---

## Documentation Update

Add to extension README:

```markdown
## Configuration

### Backend URL

LLT Assistant connects to a backend API server. By default, all features use `http://localhost:8886`.

**Simple Setup** (recommended):
```json
{
  "llt-assistant.backendUrl": "http://localhost:8886"  // or your server URL
}
```

**Advanced Setup** (per-feature override):
```json
{
  "llt-assistant.backendUrl": "http://localhost:8886",
  "llt-assistant.quality.backendUrl": "http://localhost:8887",  // Quality uses different port
  "llt-assistant.coverage.backendUrl": ""  // Empty = use default
}
```

Note: Leave feature-specific URLs empty to use the default backend URL.
```
