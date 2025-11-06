/**
 * Validator Unit Tests
 * Note: Full integration tests for project validation should be run in Docker environment
 */

import { isSystemDirectory } from '../validator';

describe('Validator', () => {
  describe('isSystemDirectory', () => {
    it('should identify system directories', () => {
      expect(isSystemDirectory('node_modules')).toBe(true);
      expect(isSystemDirectory('.git')).toBe(true);
      expect(isSystemDirectory('dist')).toBe(true);
      expect(isSystemDirectory('__pycache__')).toBe(true);
      expect(isSystemDirectory('target')).toBe(true);
    });

    it('should not identify regular directories as system', () => {
      expect(isSystemDirectory('src')).toBe(false);
      expect(isSystemDirectory('lib')).toBe(false);
      expect(isSystemDirectory('my-project')).toBe(false);
    });

    it('should handle hidden directories', () => {
      expect(isSystemDirectory('.cache')).toBe(true);
      expect(isSystemDirectory('.vscode')).toBe(true);
      expect(isSystemDirectory('.myconfig')).toBe(true); // All hidden dirs are system dirs
    });

    it('should handle paths with parent directories', () => {
      expect(isSystemDirectory('/test/path/node_modules')).toBe(true);
      expect(isSystemDirectory('/test/path/.git')).toBe(true);
      expect(isSystemDirectory('/test/path/src')).toBe(false);
    });
  });

  // Note: validateProject tests require file system access and are better suited
  // for integration testing in a Docker environment with real project directories
});
