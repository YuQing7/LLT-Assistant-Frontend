/**
 * Constants for Quality Analysis Feature
 */

export const QUALITY_DEFAULTS = {
	BACKEND_URL: 'http://localhost:8000/api/v1',
	ANALYSIS_MODE: 'hybrid' as const,
	AUTO_ANALYZE: false,
	ENABLE_INLINE_DECORATIONS: true,
	ENABLE_CODE_ACTIONS: true,
	SEVERITY_FILTER: ['error', 'warning', 'info'] as string[],
	DISABLED_RULES: [] as string[],
	LLM_TEMPERATURE: 0.3,
	RETRY_MAX_ATTEMPTS: 3,
	RETRY_BASE_DELAY_MS: 1000
};

export const EXTENSION_NAME = 'llt-assistant';
