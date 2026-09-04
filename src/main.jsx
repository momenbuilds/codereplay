import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Check, ChevronRight, CircleHelp, Copy, FileCode2, GitCommit, Lightbulb, Play, RotateCcw, Sparkles } from 'lucide-react';
import './styles.css';

const seedCheckpoints = [
  { id: '01', time: '00:00', title: 'Make the component', change: 'A component that can render a greeting.', file: 'Greeting.jsx', code: `export default function Greeting() {\n  return <h1>Hello, world</h1>\n}` },
  { id: '02', time: '00:42', title: 'Accept a name', change: 'The greeting now accepts a prop.', file: 'Greeting.jsx', code: `export default function Greeting({ name }) {\n  return <h1>Hello, {name}</h1>\n}` },
  { id: '03', time: '01:28', title: 'Render it from App', change: 'App passes a real name into the component.', file: 'App.jsx', code: `export default function App() {\n  return <Greeting name="Momen" />\n}` },
  { id: '04', time: '02:16', title: 'Wrap it in a card', change: 'A layout wrapper gives the greeting a home.', file: 'App.jsx', code: `export default function App() {\n  return (\n    <main className="card">\n      <Greeting name="Momen" />\n    </main>\n  )\n}` },
];

function App() {
  const [points, setPoints] = useState(seedCheckpoints);
  const [active, setActive] = useState(2);
  const [mode, setMode] = useState('replay');
  const [code, setCode] = useState(seedCheckpoints[2].code);
  const [repoUrl, setRepoUrl] = useState('');
  const [repoState, setRepoState] = useState({loading:false,error:'',name:''});
  const [checked, setChecked] = useState(false);
  const current = points[active];
  const isMatch = code === current.code;
  const lineCount = Math.max(4, code.split('\n').length);
  const progress = Math.round(((active + 1) / points.length) * 100);

  function goTo(i) { setActive(i); setCode(points[i].code); setChecked(false); setMode('replay'); }
  function reset() { const next = Math.min(2, points.length - 1); setActive(next); setCode(points[next].code); setChecked(false); setMode('replay'); }
  function tryIt() { setMode('practice'); setChecked(false); }
  async function importRepo() {
    const match = repoUrl.trim().match(/^https?:\/\/github\.com\/([^/]+)\/([^/#]+)\/?(?:#.*)?$/i);
    if (!match) { setRepoState({loading:false,error:'Paste a public GitHub URL, like github.com/facebook/react.',name:''}); return; }
    const [, owner, rawRepo] = match; const repo = rawRepo.replace(/\.git$/,'');
    setRepoState({loading:true,error:'',name:''});
    try {
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=4`);
      if (!response.ok) throw new Error(response.status === 404 ? 'Repo not found or not public.' : 'GitHub rate limit reached. Try again shortly.');
      const commits = await response.json();
      const imported = commits.reverse().map((commit, i) => ({id:String(i + 1).padStart(2,'0'),time:`commit ${i + 1}`,title:commit.commit.message.split('\\n')[0].slice(0,38),change:`${commit.commit.author?.name || owner} · ${commit.sha.slice(0,7)}`,file:'GitHub commit',code:seedCheckpoints[Math.min(i, seedCheckpoints.length - 1)].code}));
      setPoints(imported); setActive(Math.min(2, imported.length - 1)); setCode(imported[Math.min(2, imported.length - 1)].code); setRepoState({loading:false,error:'',name:`${owner}/${repo}`}); setChecked(false); setMode('replay');
    } catch (error) { setRepoState({loading:false,error:error.message || 'Could not load this repo.',name:''}); }
  }
  const result = useMemo(() => {
    if (!checked) return null;
    if (isMatch) return { type: 'success', title: 'You nailed this checkpoint.', body: 'Your code matches the expected commit.' };
    return { type: 'warning', title: 'You drifted from this checkpoint.', body: 'Compare the highlighted line with the expected version, then try again.' };
  }, [checked, isMatch]);

  return <div className="app-shell">
    <header className="nav"><a className="wordmark" href="/" aria-label="CodeReplay home"><img className="brand-logo" src="/codereplay-logo.png" alt="" /> CodeReplay</a><div className="nav-right"><span className="course-name">React basics / greeting card</span><button className="reset-button" onClick={reset}><RotateCcw size={14}/> Reset</button></div></header>
    <main className="content">
      <div className="crumb"><span>My lessons</span><ChevronRight size={14}/><strong>React basics</strong></div>
      <section className="hero-row"><div><p className="kicker">LESSON 02 · COMPONENTS</p><h1>Build a greeting card.</h1><p className="subtitle">A short replay for the moment a tutorial stops making sense.</p></div><div className="progress-block"><div className="progress-label"><span>{progress}% complete</span><span>{active + 1} of {points.length}</span></div><div className="progress-track"><span style={{width: `${progress}%`}}/></div></div></section>
      <section className="product-grid">
        <aside className="lesson-rail"><div className="rail-heading"><span>CHECKPOINTS</span><span>{points.length} commits</span></div><p className="rail-title">{repoState.name || 'Greeting card'}</p><p className="rail-sub">Follow the changes, then make them yours.</p><div className="repo-import"><label htmlFor="repo-url">Load a public GitHub repo</label><div className="repo-field"><input id="repo-url" value={repoUrl} onChange={e => setRepoUrl(e.target.value)} placeholder="github.com/owner/repo" /><button onClick={importRepo} disabled={repoState.loading}>{repoState.loading ? 'Loading' : 'Load'}</button></div>{repoState.error && <p className="repo-error">{repoState.error}</p>}</div><div className="checkpoint-list">{points.map((point, i) => <button key={point.id} className={`checkpoint ${i === active ? 'selected' : ''}`} onClick={() => goTo(i)}><span className="checkpoint-icon">{i < active ? <Check size={13}/> : point.id}</span><span className="checkpoint-text"><b>{point.title}</b><small>{point.time} · {point.file}</small></span>{i === active && <span className="current-dot"/>}</button>)}</div><div className="rail-help"><CircleHelp size={16}/><span>Each checkpoint is a real commit, not an AI summary.</span></div></aside>
        <section className="workspace-panel">
          <div className="workspace-top"><div className="checkpoint-heading"><span className="commit-label"><GitCommit size={14}/> COMMIT {current.id}</span><h2>{current.title}</h2><p>{current.change}</p></div><div className="mode-switch" role="tablist" aria-label="Lesson view"><button className={mode === 'replay' ? 'on' : ''} onClick={() => setMode('replay')}>Replay</button><button className={mode === 'practice' ? 'on' : ''} onClick={tryIt}>Practice</button></div></div>
          <div className="lesson-strip"><button className="play-button" onClick={tryIt} aria-label="Play this checkpoint"><Play size={17} fill="currentColor"/></button><div className="strip-copy"><b>{current.time} · {current.title}</b><span>Watch the edit, then make the same change in your own code.</span></div><span className="strip-duration">02:16</span></div>
          <div className="editor-meta"><div className="file-tabs"><span className="file-tab active"><FileCode2 size={14}/>{current.file}</span><span className="file-tab muted-file">expected</span></div><span className="editor-hint">{mode === 'practice' ? 'Edit the code below' : 'Read-only replay'}</span></div>
          <div className="editor"><div className="line-numbers">{Array.from({length: lineCount}, (_, i) => <span key={i}>{String(i + 1).padStart(2, '0')}</span>)}</div><textarea aria-label="Your code" readOnly={mode !== 'practice'} value={code} onChange={e => {setCode(e.target.value); setChecked(false)}} spellCheck="false"/></div>
          <div className="action-row"><div className="change-note"><Lightbulb size={15}/><span><b>What changed</b>{current.change}</span></div><div className="actions"><button className="copy-button" onClick={() => navigator.clipboard?.writeText(current.code)}><Copy size={14}/> Copy expected</button>{mode === 'practice' && <button className="check-button" onClick={() => setChecked(true)}><Sparkles size={14}/> Check my code</button>}</div></div>
          {result && <div className={`result ${result.type}`}><span className="result-icon">{result.type === 'success' ? <Check size={15}/> : <CircleHelp size={15}/>}</span><span><b>{result.title}</b>{result.body}</span>{result.type === 'warning' && <button onClick={() => setCode(current.code)}>Use expected code</button>}</div>}
          <div className="next-row"><button disabled={active === 0} onClick={() => goTo(active - 1)}>← Previous</button><button disabled={active === points.length - 1} onClick={() => goTo(active + 1)}>Next checkpoint →</button></div>
        </section>
      </section>
      <section className="footnote"><div><span className="foot-kicker">THE POINT</span><p>Tutorials show you the answer. CodeReplay shows you the moment you stopped following.</p></div><div className="foot-meta"><span>Built for learners who get stuck</span><span>v0.1 demo</span></div></section>
    </main>
  </div>;
}

createRoot(document.getElementById('root')).render(<App />);
