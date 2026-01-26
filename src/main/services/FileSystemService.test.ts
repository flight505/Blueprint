import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'node:path';
import {
  setAllowedBasePaths,
  addAllowedBasePath,
  clearAllowedBasePaths,
  isPathAllowed,
  validatePath,
  getFileExtension,
} from './FileSystemService';

describe('FileSystemService', () => {
  beforeEach(() => {
    clearAllowedBasePaths();
  });

  afterEach(() => {
    clearAllowedBasePaths();
  });

  describe('Path Security Functions', () => {
    describe('setAllowedBasePaths', () => {
      it('sets multiple allowed base paths', () => {
        setAllowedBasePaths(['/home/user/projects', '/home/user/documents']);
        expect(isPathAllowed('/home/user/projects/file.txt')).toBe(true);
        expect(isPathAllowed('/home/user/documents/file.txt')).toBe(true);
      });

      it('clears previous paths when setting new ones', () => {
        setAllowedBasePaths(['/path1']);
        setAllowedBasePaths(['/path2']);
        expect(isPathAllowed('/path1/file.txt')).toBe(false);
        expect(isPathAllowed('/path2/file.txt')).toBe(true);
      });

      it('resolves relative paths to absolute', () => {
        const cwd = process.cwd();
        setAllowedBasePaths(['./relative']);
        expect(isPathAllowed(path.join(cwd, 'relative', 'file.txt'))).toBe(true);
      });
    });

    describe('addAllowedBasePath', () => {
      it('adds a path to the allowed set', () => {
        setAllowedBasePaths(['/path1']);
        addAllowedBasePath('/path2');
        expect(isPathAllowed('/path1/file.txt')).toBe(true);
        expect(isPathAllowed('/path2/file.txt')).toBe(true);
      });

      it('does not duplicate existing paths', () => {
        setAllowedBasePaths(['/path1']);
        addAllowedBasePath('/path1');
        expect(isPathAllowed('/path1/file.txt')).toBe(true);
      });
    });

    describe('clearAllowedBasePaths', () => {
      it('removes all allowed paths', () => {
        setAllowedBasePaths(['/path1', '/path2']);
        clearAllowedBasePaths();
        expect(isPathAllowed('/path1/file.txt')).toBe(false);
        expect(isPathAllowed('/path2/file.txt')).toBe(false);
      });
    });

    describe('isPathAllowed', () => {
      beforeEach(() => {
        setAllowedBasePaths(['/allowed/path']);
      });

      it('returns false when no paths are allowed', () => {
        clearAllowedBasePaths();
        expect(isPathAllowed('/any/path/file.txt')).toBe(false);
      });

      it('returns true for exact base path match', () => {
        expect(isPathAllowed('/allowed/path')).toBe(true);
      });

      it('returns true for files within allowed directory', () => {
        expect(isPathAllowed('/allowed/path/file.txt')).toBe(true);
        expect(isPathAllowed('/allowed/path/subdir/file.txt')).toBe(true);
      });

      it('returns false for paths outside allowed directory', () => {
        expect(isPathAllowed('/not/allowed/file.txt')).toBe(false);
        expect(isPathAllowed('/allowed/other/file.txt')).toBe(false);
      });

      it('prevents path traversal attacks using ..', () => {
        expect(isPathAllowed('/allowed/path/../../../etc/passwd')).toBe(false);
        expect(isPathAllowed('/allowed/path/subdir/../../outside/file.txt')).toBe(false);
      });

      it('prevents prefix attack (/allowed/pathevil)', () => {
        expect(isPathAllowed('/allowed/pathevil/file.txt')).toBe(false);
        expect(isPathAllowed('/allowed/path_extra/file.txt')).toBe(false);
      });

      it('handles trailing slashes correctly', () => {
        expect(isPathAllowed('/allowed/path/')).toBe(true);
        expect(isPathAllowed('/allowed/path/subdir/')).toBe(true);
      });
    });

    describe('validatePath', () => {
      beforeEach(() => {
        setAllowedBasePaths(['/allowed/path']);
      });

      it('does not throw for allowed paths', () => {
        expect(() => validatePath('/allowed/path/file.txt', 'readFile')).not.toThrow();
      });

      it('throws for disallowed paths with descriptive error', () => {
        expect(() => validatePath('/not/allowed/file.txt', 'readFile')).toThrow(
          /Security: Path ".*" is not within allowed directories/
        );
      });

      it('includes operation name in error message', () => {
        expect(() => validatePath('/not/allowed/file.txt', 'writeFile')).toThrow(/writeFile/);
      });

      it('includes allowed paths in error message', () => {
        expect(() => validatePath('/not/allowed/file.txt', 'readFile')).toThrow(/\/allowed\/path/);
      });

      it('handles empty allowed paths set', () => {
        clearAllowedBasePaths();
        expect(() => validatePath('/any/path', 'readFile')).toThrow(/Allowed paths: none/);
      });
    });
  });

  describe('getFileExtension', () => {
    it('extracts file extension', () => {
      expect(getFileExtension('/path/to/file.ts')).toBe('ts');
      expect(getFileExtension('/path/to/file.test.tsx')).toBe('tsx');
      expect(getFileExtension('/path/to/file.JSON')).toBe('json');
    });

    it('returns empty string for files without extension', () => {
      expect(getFileExtension('/path/to/Makefile')).toBe('');
    });

    it('handles dotfiles - treated as no extension by path.extname', () => {
      // path.extname treats .gitignore as having no extension
      expect(getFileExtension('/path/to/.gitignore')).toBe('');
    });

    it('handles edge cases', () => {
      expect(getFileExtension('')).toBe('');
      expect(getFileExtension('file')).toBe('');
      // .hidden is treated as having no extension by path.extname
      expect(getFileExtension('.hidden')).toBe('');
    });
  });
});
