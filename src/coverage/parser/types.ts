/**
 * Types for Coverage XML Parser
 */

/**
 * Raw XML coverage data structures
 */
export interface RawCoverageClass {
	$: {
		filename: string;
		'line-rate': string;
		'branch-rate': string;
		complexity?: string;
	};
	lines: Array<{
		line: RawCoverageLine[];
	}>;
	methods?: Array<{
		method: Array<{
			$: {
				name: string;
				signature: string;
			};
			lines: Array<{
				line: RawCoverageLine[];
			}>;
		}>;
	}>;
}

export interface RawCoverageLine {
	$: {
		number: string;
		hits: string;
		branch?: string;
		'condition-coverage'?: string;
		'missing-branches'?: string;
	};
}

export interface RawCoveragePackage {
	$: {
		name: string;
		'line-rate': string;
		'branch-rate': string;
		complexity?: string;
	};
	classes: Array<{
		class: RawCoverageClass[];
	}>;
}

/**
 * Parsed function information from source code
 */
export interface ParsedFunction {
	name: string;
	startLine: number;
	endLine: number;
	isCovered: boolean;
	coveredLines: number[];
	uncoveredLines: number[];
	branches: ParsedBranch[];
}

/**
 * Parsed branch information
 */
export interface ParsedBranch {
	line: number;
	type: 'if' | 'else' | 'except' | 'elif' | 'while' | 'for';
	isCovered: boolean;
	condition?: string;
}

/**
 * Parser options
 */
export interface ParserOptions {
	minComplexity?: number;
	includeTrivialFunctions?: boolean;
	focusOnBranches?: boolean;
}
