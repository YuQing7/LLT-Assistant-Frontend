/**
 * API Types for Coverage Optimization Feature
 * Backend API integration types for coverage test generation
 */

/**
 * Branch information for uncovered code paths
 */
export interface BranchInfo {
	line: number;
	type: 'if' | 'else' | 'except' | 'elif' | 'while' | 'for';
	description: string;
	condition?: string;
}

/**
 * Uncovered function information
 */
export interface UncoveredFunction {
	name: string;
	startLine: number;
	endLine: number;
	complexity?: number;
	code?: string;
}

/**
 * Partially covered function information
 */
export interface PartiallyCoveredFunction {
	name: string;
	startLine: number;
	endLine: number;
	uncoveredBranches: BranchInfo[];
	code?: string;
}

/**
 * Coverage data for a single file
 */
export interface CoverageFileData {
	filePath: string;
	lineCoverage: number;
	branchCoverage: number;
	totalLines: number;
	coveredLines: number;
	uncoveredFunctions: UncoveredFunction[];
	partiallyCoveredFunctions: PartiallyCoveredFunction[];
}

/**
 * Overall coverage statistics
 */
export interface CoverageStats {
	lineCoverage: number;
	branchCoverage: number;
	totalLines: number;
	coveredLines: number;
	totalBranches?: number;
	coveredBranches?: number;
}

/**
 * Complete coverage report
 */
export interface CoverageReport {
	overallStats: CoverageStats;
	files: CoverageFileData[];
	timestamp?: Date;
	reportPath?: string;
}

/**
 * Request to generate coverage tests for a specific function
 */
export interface GenerateCoverageTestRequest {
	filePath: string;
	functionName: string;
	functionCode: string;
	uncoveredBranches?: BranchInfo[];
	existingTests?: string;
	context?: {
		imports?: string;
		relatedClasses?: string;
		fixtures?: string;
	};
}

/**
 * Response from coverage test generation
 */
export interface GenerateCoverageTestResponse {
	generatedTests: string;
	explanation: string;
	targetCoverage?: number;
	coveredBranches?: string[];
}

/**
 * Batch request to generate tests for multiple functions
 */
export interface BatchGenerateCoverageTestRequest {
	requests: GenerateCoverageTestRequest[];
}

/**
 * Batch response for multiple test generations
 */
export interface BatchGenerateCoverageTestResponse {
	results: GenerateCoverageTestResponse[];
	totalGenerated: number;
	failures?: string[];
}

/**
 * Coverage comparison result
 */
export interface CoverageComparison {
	before: CoverageStats;
	after: CoverageStats;
	improvement: {
		lineCoverageChange: number;
		branchCoverageChange: number;
		percentageChange: number;
	};
	filesImproved: Array<{
		filePath: string;
		beforeCoverage: number;
		afterCoverage: number;
		change: number;
	}>;
	remainingGaps: CoverageFileData[];
}

/**
 * Coverage analysis mode
 */
export type CoverageAnalysisMode = 'function' | 'branch' | 'mixed';

/**
 * Backend error for coverage operations
 */
export interface CoverageBackendError {
	type: 'network' | 'validation' | 'server' | 'timeout' | 'unknown';
	message: string;
	detail: string;
	statusCode?: number;
}
