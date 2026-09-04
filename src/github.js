const ignoredPath = /(?:^|\/)(?:dist|build|coverage|vendor|node_modules|\.next|\.nuxt|target|Pods)\/|(?:^|\/)(?:package-lock\.json|pnpm-lock\.yaml|yarn\.lock|poetry\.lock|Cargo\.lock|composer\.lock|Gemfile\.lock)$|\.min\./i;
const binaryExtension = /\.(?:7z|a|apk|app|avi|bin|bmp|class|db|dll|dmg|doc|docx|dylib|eot|exe|flac|gif|gz|ico|iso|jar|jpeg|jpg|lockb|m4a|mov|mp3|mp4|o|otf|pdf|png|ppt|pptx|pyc|rar|so|sqlite|tar|tiff?|ttf|wav|webm|webp|woff2?|xls|xlsx|xz|zip)$/i;
const languageNames = new Map([
  ['c', 'C'], ['cc', 'C++'], ['cpp', 'C++'], ['cs', 'C#'], ['css', 'CSS'], ['dart', 'Dart'],
  ['ex', 'Elixir'], ['exs', 'Elixir'], ['go', 'Go'], ['h', 'C header'], ['hpp', 'C++ header'],
  ['html', 'HTML'], ['java', 'Java'], ['js', 'JavaScript'], ['jsx', 'React JSX'], ['kt', 'Kotlin'],
  ['kts', 'Kotlin'], ['lua', 'Lua'], ['m', 'Objective-C'], ['md', 'Markdown'], ['mm', 'Objective-C++'],
  ['php', 'PHP'], ['py', 'Python'], ['r', 'R'], ['rb', 'Ruby'], ['rs', 'Rust'], ['scala', 'Scala'],
  ['scss', 'SCSS'], ['sh', 'Shell'], ['sol', 'Solidity'], ['sql', 'SQL'], ['svelte', 'Svelte'],
  ['swift', 'Swift'], ['ts', 'TypeScript'], ['tsx', 'React TSX'], ['vue', 'Vue'], ['xml', 'XML'],
  ['yaml', 'YAML'], ['yml', 'YAML'], ['zig', 'Zig'],
]);

export function parseGithubUrl(value) {
  const normalized = value.trim().replace(/^github\.com\//i, 'https://github.com/');
  const match = normalized.match(/^https?:\/\/github\.com\/([^/]+)\/([^/#?]+?)(?:\.git)?\/?(?:[?#].*)?$/i);
  return match ? { owner: match[1], repo: match[2] } : null;
}

export function isCandidatePath(filename) {
  return !ignoredPath.test(filename) && !binaryExtension.test(filename);
}

export function decodeGithubContent(content) {
  try {
    const bytes = Uint8Array.from(atob(content.replace(/\n/g, '')), (character) => character.charCodeAt(0));
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

export function isReadableText(value) {
  if (!value?.trim() || value.length > 90000 || value.includes('\0')) return false;
  const sample = value.slice(0, 8000);
  let controls = 0;
  for (const character of sample) {
    const code = character.charCodeAt(0);
    if (code < 32 && code !== 9 && code !== 10 && code !== 13) controls += 1;
  }
  return controls / sample.length < 0.01;
}

export function languageLabel(filename) {
  const base = filename.split('/').pop() || filename;
  const special = { Dockerfile: 'Dockerfile', Makefile: 'Makefile', Rakefile: 'Ruby', Gemfile: 'Ruby' };
  if (special[base]) return special[base];
  const extension = base.includes('.') ? base.split('.').pop().toLowerCase() : '';
  return languageNames.get(extension) || (extension ? extension.toUpperCase() : 'Text source');
}

function candidateScore(file) {
  const testFile = /(?:^|\/)(?:test|tests|spec|specs|fixtures)\//i.test(file.filename);
  const docsFile = /\.(?:md|mdx|txt|rst)$/i.test(file.filename);
  const configFile = /\.(?:json|ya?ml|toml|ini)$/i.test(file.filename);
  return Number(testFile) * 300000 + Number(docsFile) * 200000 + Number(configFile) * 100000 + Math.min(file.changes || 0, 99999);
}

export async function checkpointFromCommit(commit, index, owner, githubJson) {
  const detail = await githubJson(commit.url);
  const candidates = (detail.files || [])
    .filter((file) => file.status !== 'removed' && isCandidatePath(file.filename))
    .sort((a, b) => candidateScore(a) - candidateScore(b));

  for (const file of candidates) {
    if (!file.contents_url) continue;
    try {
      const source = await githubJson(file.contents_url);
      if (source.type !== 'file' || source.encoding !== 'base64' || !source.content) continue;
      const rawCode = decodeGithubContent(source.content);
      if (!isReadableText(rawCode)) continue;
      return {
        id: String(index + 1).padStart(2, '0'),
        sha: commit.sha.slice(0, 7),
        title: commit.commit.message.split('\n')[0].slice(0, 64),
        change: `${file.changes} lines changed in ${file.filename}`,
        file: file.filename,
        language: languageLabel(file.filename),
        author: commit.commit.author?.name || owner,
        code: rawCode,
        additions: file.additions,
        deletions: file.deletions,
        url: commit.html_url,
      };
    } catch {
      // Continue through the other files when GitHub cannot return one candidate.
    }
  }

  return null;
}
