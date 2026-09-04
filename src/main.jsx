import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clipboard,
  Code2,
  ExternalLink,
  FileCode2,
  GitBranch,
  GitCommitHorizontal,
  GitFork,
  LoaderCircle,
  Play,
  RotateCcw,
  Sparkles,
  XCircle,
} from 'lucide-react';
import './styles.css';

const exampleRepo = 'https://github.com/moment/moment';

const seedCheckpoints = [
  {
    id: '01',
    sha: 'start',
    title: 'Create the greeting',
    change: 'A small component renders the first useful output.',
    file: 'Greeting.jsx',
    author: 'CodeReplay',
    code: `export default function Greeting() {\n  return <h1>Hello, world</h1>\n}`,
    additions: 3,
    deletions: 0,
  },
  {
    id: '02',
    sha: 'props',
    title: 'Make it personal',
    change: 'The component accepts a name instead of hard-coding the message.',
    file: 'Greeting.jsx',
    author: 'CodeReplay',
    code: `export default function Greeting({ name }) {\n  return <h1>Hello, {name}</h1>\n}`,
    additions: 2,
    deletions: 2,
  },
  {
    id: '03',
    sha: 'render',
    title: 'Use it from App',
    change: 'App now renders the component with a real value.',
    file: 'App.jsx',
    author: 'CodeReplay',
    code: `import Greeting from './Greeting'\n\nexport default function App() {\n  return <Greeting name="Momen" />\n}`,
    additions: 5,
    deletions: 0,
  },
  {
    id: '04',
    sha: 'finish',
    title: 'Give it structure',
    change: 'A semantic wrapper makes the component ready to style.',
    file: 'App.jsx',
    author: 'CodeReplay',
    code: `import Greeting from './Greeting'\n\nexport default function App() {\n  return (\n    <main className="card">\n      <Greeting name="Momen" />\n    </main>\n  )\n}`,
    additions: 9,
    deletions: 1,
  },
];

const codeExtensions = /\.(?:c|cc|cpp|cs|css|dart|ex|exs|go|h|hpp|html|java|js|jsx|kt|kts|lua|m|mm|php|py|r|rb|rs|scala|scss|sh|sol|sql|svelte|swift|ts|tsx|vue)$/i;
const ignoredFiles = /(?:^|\/)(?:dist|build|coverage|vendor|node_modules)\/|(?:^|\/)(?:package-lock|pnpm-lock|yarn\.lock|poetry\.lock|Cargo\.lock)$|\.min\./i;

function normalizeCode(value) {
  return value.replace(/\r\n/g, '\n').trim();
}

function parseGithubUrl(value) {
  const normalized = value.trim().replace(/^github\.com\//i, 'https://github.com/');
  const match = normalized.match(/^https?:\/\/github\.com\/([^/]+)\/([^/#?]+?)(?:\.git)?\/?(?:[?#].*)?$/i);
  return match ? { owner: match[1], repo: match[2] } : null;
}

function decodeGithubContent(content) {
  const bytes = Uint8Array.from(atob(content.replace(/\n/g, '')), (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

async function githubJson(url) {
  const response = await fetch(url, { headers: { Accept: 'application/vnd.github+json' } });
  if (!response.ok) {
    if (response.status === 404) throw new Error('That repository was not found or is private.');
    if (response.status === 403) throw new Error('GitHub’s public API limit was reached. Wait a few minutes and try again.');
    throw new Error('GitHub could not load this repository right now.');
  }
  return response.json();
}

async function checkpointFromCommit(commit, index, owner) {
  const detail = await githubJson(commit.url);
  const candidates = (detail.files || [])
    .filter((file) => file.status !== 'removed' && codeExtensions.test(file.filename) && !ignoredFiles.test(file.filename))
    .sort((a, b) => {
      const aTest = /(?:^|\/)(?:test|tests|spec|specs)\//i.test(a.filename);
      const bTest = /(?:^|\/)(?:test|tests|spec|specs)\//i.test(b.filename);
      return Number(aTest) - Number(bTest) || a.changes - b.changes;
    });

  for (const file of candidates) {
    if (!file.contents_url) continue;
    try {
      const source = await githubJson(file.contents_url);
      if (source.type !== 'file' || source.encoding !== 'base64' || !source.content) continue;
      const rawCode = decodeGithubContent(source.content);
      if (!rawCode.trim() || rawCode.length > 90000) continue;
      return {
        id: String(index + 1).padStart(2, '0'),
        sha: commit.sha.slice(0, 7),
        title: commit.commit.message.split('\n')[0].slice(0, 64),
        change: `${file.changes} lines changed in ${file.filename}`,
        file: file.filename,
        author: commit.commit.author?.name || owner,
        code: rawCode,
        additions: file.additions,
        deletions: file.deletions,
        url: commit.html_url,
      };
    } catch {
      // A single unavailable file should not discard the rest of the commit history.
    }
  }

  return null;
}

function App() {
  const [points, setPoints] = useState(seedCheckpoints);
  const [active, setActive] = useState(0);
  const [mode, setMode] = useState('replay');
  const [code, setCode] = useState(seedCheckpoints[0].code);
  const [repoUrl, setRepoUrl] = useState('');
  const [repoState, setRepoState] = useState({ loading: false, error: '', name: 'CodeReplay demo', url: '' });
  const [checked, setChecked] = useState(false);
  const [copied, setCopied] = useState(false);

  const current = points[active];
  const previous = active > 0 ? points[active - 1] : null;
  const isMatch = normalizeCode(code) === normalizeCode(current.code);
  const progress = Math.round(((active + 1) / points.length) * 100);
  const sourceLines = current.code.split('\n');
  const previousLines = previous?.file === current.file ? previous.code.split('\n') : [];
  const changedLines = useMemo(
    () => sourceLines.map((line, index) => previousLines[index] !== line),
    [current.code, previous?.code, previous?.file],
  );

  function openCheckpoint(index) {
    setActive(index);
    setCode(points[index].code);
    setMode('replay');
    setChecked(false);
    setCopied(false);
  }

  function resetLesson() {
    setPoints(seedCheckpoints);
    setActive(0);
    setCode(seedCheckpoints[0].code);
    setRepoUrl('');
    setRepoState({ loading: false, error: '', name: 'CodeReplay demo', url: '' });
    setMode('replay');
    setChecked(false);
  }

  async function copyExpected() {
    await navigator.clipboard?.writeText(current.code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  async function importRepo(urlOverride) {
    const requestedUrl = typeof urlOverride === 'string' ? urlOverride : repoUrl;
    const parsed = parseGithubUrl(requestedUrl);
    if (!parsed) {
      setRepoState((state) => ({ ...state, error: 'Enter a public repository URL, such as github.com/owner/project.' }));
      return;
    }

    const { owner, repo } = parsed;
    setRepoUrl(`https://github.com/${owner}/${repo}`);
    setRepoState({ loading: true, error: '', name: `${owner}/${repo}`, url: `https://github.com/${owner}/${repo}` });

    try {
      const commits = await githubJson(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=8`);
      const results = await Promise.allSettled(commits.map((commit, index) => checkpointFromCommit(commit, index, owner)));
      const imported = results.map((result) => result.status === 'fulfilled' ? result.value : null);

      const usable = imported.filter(Boolean).reverse();
      if (!usable.length) throw new Error('The latest commits do not contain a readable source file under 90 KB. Try a repository with recent code changes.');
      const lesson = usable.map((point, index) => ({ ...point, id: String(index + 1).padStart(2, '0') }));
      setPoints(lesson);
      setActive(0);
      setCode(lesson[0].code);
      setMode('replay');
      setChecked(false);
      setRepoState({ loading: false, error: '', name: `${owner}/${repo}`, url: `https://github.com/${owner}/${repo}` });
    } catch (error) {
      const message = error instanceof TypeError ? 'The browser could not reach GitHub. Check your connection and try again.' : error.message;
      setRepoState((state) => ({ ...state, loading: false, error: message || 'The repository could not be imported.' }));
    }
  }

  const feedback = checked
    ? isMatch
      ? { type: 'success', title: 'Exact match', body: 'Your version matches this commit.' }
      : { type: 'error', title: 'Not there yet', body: 'Your edit differs from the source. Restore it or keep working.' }
    : null;

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href={import.meta.env.BASE_URL} aria-label="CodeReplay home">
          <img src={`${import.meta.env.BASE_URL}codereplay-logo.png`} alt="" />
          <span>CodeReplay</span>
        </a>
        <div className="topbar-actions">
          <span className="status-pill"><span /> Public preview</span>
          <a href="https://github.com/momenbuilds/codereplay" target="_blank" rel="noreferrer"><GitFork size={16} /> Source</a>
        </div>
      </header>

      <main>
        <section className="intro">
          <div>
            <p className="intro-note">Learn from working code</p>
            <h1>Replay the decisions,<br />not another tutorial.</h1>
          </div>
          <p className="intro-copy">Drop in a public GitHub repository. CodeReplay turns its latest source changes into a lesson you can inspect, edit, and verify.</p>
        </section>

        <section className="import-bar" aria-label="Import a repository">
          <GitFork size={20} />
          <label htmlFor="repo-url">GitHub repository</label>
          <input
            id="repo-url"
            value={repoUrl}
            onChange={(event) => {
              setRepoUrl(event.target.value);
              if (repoState.error) setRepoState((state) => ({ ...state, error: '' }));
            }}
            onKeyDown={(event) => event.key === 'Enter' && importRepo()}
            placeholder="github.com/owner/project"
            disabled={repoState.loading}
          />
          <button className="example-button" onClick={() => importRepo(exampleRepo)} disabled={repoState.loading}>Try an example</button>
          <button className="import-button" onClick={() => importRepo()} disabled={repoState.loading}>
            {repoState.loading ? <><LoaderCircle className="spin" size={16} /> Reading commits</> : <>Build lesson <ChevronRight size={16} /></>}
          </button>
        </section>
        {repoState.error && <div className="import-error" role="alert"><XCircle size={17} /><span>{repoState.error}</span></div>}

        {!repoState.error && <section className="player">
          <aside className="timeline">
            <div className="timeline-head">
              <div><span>Lesson source</span><h2>{repoState.name}</h2></div>
              {repoState.url && <a href={repoState.url} target="_blank" rel="noreferrer" aria-label="Open repository"><ExternalLink size={16} /></a>}
            </div>

            <div className="lesson-progress">
              <div><span>Progress</span><strong>{active + 1} / {points.length}</strong></div>
              <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
            </div>

            <nav className="commit-list" aria-label="Lesson checkpoints">
              {points.map((point, index) => (
                <button key={`${point.sha}-${point.id}`} className={index === active ? 'active' : ''} onClick={() => openCheckpoint(index)}>
                  <span className="step-number">{index < active ? <Check size={14} /> : point.id}</span>
                  <span className="step-copy"><b>{point.title}</b><small>{point.sha} · {point.file.split('/').pop()}</small></span>
                </button>
              ))}
            </nav>

            <button className="reset-link" onClick={resetLesson}><RotateCcw size={14} /> Reset to demo lesson</button>
          </aside>

          <article className="workspace">
            <header className="workspace-head">
              <div>
                <div className="commit-meta"><GitCommitHorizontal size={16} /><span>{current.sha}</span><span>by {current.author}</span></div>
                <h2>{current.title}</h2>
                <p>{current.change}</p>
              </div>
              <div className="mode-tabs" role="tablist" aria-label="Workspace mode">
                <button role="tab" aria-selected={mode === 'replay'} className={mode === 'replay' ? 'active' : ''} onClick={() => { setMode('replay'); setChecked(false); }}><Play size={14} /> Replay</button>
                <button role="tab" aria-selected={mode === 'practice'} className={mode === 'practice' ? 'active' : ''} onClick={() => { setMode('practice'); setChecked(false); }}><Code2 size={14} /> Practice</button>
              </div>
            </header>

            <div className="filebar">
              <span><FileCode2 size={15} /> {current.file}</span>
              <span className="diff-stat"><b>+{current.additions}</b><i>−{current.deletions}</i></span>
              {current.url && <a href={current.url} target="_blank" rel="noreferrer">View commit <ExternalLink size={13} /></a>}
            </div>

            {mode === 'replay' ? (
              <div className="code-view" aria-label="Commit source code">
                {sourceLines.map((line, index) => (
                  <div className={changedLines[index] ? 'changed' : ''} key={`${index}-${line}`}>
                    <span>{index + 1}</span><code>{line || ' '}</code>
                  </div>
                ))}
              </div>
            ) : (
              <div className="practice-editor"><textarea aria-label="Practice code" value={code} onChange={(event) => { setCode(event.target.value); setChecked(false); }} spellCheck="false" /></div>
            )}

            <div className="workspace-footer">
              <div className="change-summary"><GitBranch size={16} /><span><b>{mode === 'replay' ? 'Lines highlighted in blue changed here.' : 'Recreate this checkpoint in the editor.'}</b><small>{previous?.file === current.file ? 'Compared with the previous checkpoint.' : 'This checkpoint starts a different file.'}</small></span></div>
              <div className="workspace-actions">
                <button onClick={copyExpected}><Clipboard size={15} /> {copied ? 'Copied' : 'Copy source'}</button>
                {mode === 'practice' && <button className="primary-action" onClick={() => setChecked(true)}><Sparkles size={15} /> Check my work</button>}
              </div>
            </div>

            {feedback && (
              <div className={`feedback ${feedback.type}`} role="status">
                {feedback.type === 'success' ? <Check size={18} /> : <XCircle size={18} />}
                <span><b>{feedback.title}</b><small>{feedback.body}</small></span>
                {feedback.type === 'error' && <button onClick={() => { setCode(current.code); setChecked(false); }}>Restore source</button>}
              </div>
            )}

            <footer className="step-nav">
              <button disabled={active === 0} onClick={() => openCheckpoint(active - 1)}><ChevronLeft size={16} /> Previous</button>
              <span>{progress}% complete</span>
              <button disabled={active === points.length - 1} onClick={() => openCheckpoint(active + 1)}>Next <ChevronRight size={16} /></button>
            </footer>
          </article>
        </section>}
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
