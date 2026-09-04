import test from 'node:test';
import assert from 'node:assert/strict';
import { checkpointFromCommit, decodeGithubContent, isCandidatePath, isReadableText, languageLabel, parseGithubUrl } from '../src/github.js';

const representativeSources = [
  'main.c', 'main.cpp', 'Program.cs', 'style.css', 'main.dart', 'app.ex', 'main.go', 'index.html',
  'Main.java', 'app.js', 'App.jsx', 'Main.kt', 'main.lua', 'ViewController.m', 'index.php', 'app.py',
  'analysis.r', 'app.rb', 'lib.rs', 'Main.scala', 'main.sh', 'Token.sol', 'schema.sql', 'App.svelte',
  'App.swift', 'app.ts', 'App.tsx', 'App.vue', 'build.zig', 'main.futurelang', 'Dockerfile', 'Makefile',
];

test('accepts text source without a language allowlist', () => {
  for (const filename of representativeSources) {
    assert.equal(isCandidatePath(`src/${filename}`), true, filename);
    assert.equal(isReadableText('function example() {\n  return 42\n}\n'), true, filename);
  }
});

test('builds a real lesson checkpoint for every representative source type', async () => {
  for (const filename of representativeSources) {
    const commit = {
      sha: '1234567890abcdef',
      url: 'commit-detail',
      html_url: 'https://github.com/example/project/commit/1234567',
      commit: { message: `Update ${filename}`, author: { name: 'Developer' } },
    };
    const githubJson = async (url) => url === 'commit-detail'
      ? { files: [{ filename: `src/${filename}`, status: 'modified', changes: 3, additions: 2, deletions: 1, contents_url: 'file-content' }] }
      : { type: 'file', encoding: 'base64', content: btoa('function example() {\n  return 42\n}\n') };
    const checkpoint = await checkpointFromCommit(commit, 0, 'example', githubJson);
    assert.equal(checkpoint?.file, `src/${filename}`, filename);
    assert.equal(checkpoint?.code.includes('return 42'), true, filename);
  }
});

test('rejects generated paths, lockfiles, binaries, invalid UTF-8, and control data', () => {
  for (const filename of ['dist/app.js', 'node_modules/a/index.js', 'image.png', 'video.mp4', 'archive.zip', 'package-lock.json']) {
    assert.equal(isCandidatePath(filename), false, filename);
  }
  assert.equal(decodeGithubContent('/w=='), null);
  assert.equal(isReadableText('hello\0world'), false);
});

test('labels known languages and keeps unknown languages usable', () => {
  assert.equal(languageLabel('Sources/App.swift'), 'Swift');
  assert.equal(languageLabel('src/main.futurelang'), 'FUTURELANG');
  assert.equal(languageLabel('Dockerfile'), 'Dockerfile');
});

test('parses canonical and shorthand GitHub repository URLs', () => {
  assert.deepEqual(parseGithubUrl('github.com/momenbuilds/throttle'), { owner: 'momenbuilds', repo: 'throttle' });
  assert.deepEqual(parseGithubUrl('https://github.com/moment/moment.git'), { owner: 'moment', repo: 'moment' });
  assert.equal(parseGithubUrl('https://example.com/not-github'), null);
});
