/**
 * Metadata Services
 * Export all metadata extraction and persistence services
 */

export { PackageAnalyzer } from './package-analyzer';
export type { PackageInfo, DependencyAnalysis } from './package-analyzer';

export { FrameworkDetector } from './framework-detector';
export type { FrameworkDetectionResult } from './framework-detector';

export { LanguageDetector } from './language-detector';
export type { LanguageDetectionResult } from './language-detector';

export { PackageManagerDetector } from './package-manager-detector';
export type { PackageManager, PackageManagerDetectionResult } from './package-manager-detector';

export { FileCounter } from './file-counter';
export type { FileCountResult } from './file-counter';

export { MetadataExtractor } from './metadata-extractor';
export type { ProjectMetadata } from './metadata-extractor';

export { DatabaseService } from './database-service';
