import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Bookmark, Download, LoaderCircle, Mic, Volume2 } from 'lucide-react';
import { apiUrl } from './api';

type Phrase = { word: string; meaning: string; use: string; type: string };
type Lesson = { icon: string; title: string; tag: string; time: string; color: string; desc: string };

export default function WorkspaceView({ active, search, phrases, lessons, saved, onSaved, notify, speak, name, setName, navigate, token, onLogin, sentence, setSentence, startMic, practice, result, practiceBusy }: {
  active: string; search: string; phrases: Phrase[]; lessons: Lesson[]; saved: string[]; onSaved: (word: string) => void;
  notify: (message: string) => void; speak: (text: string) => void; name: string; setName: (name: string) => void; navigate: (page: string) => void;
  token: string; onLogin: () => void; sentence: string; setSentence: (value: string) => void; startMic: () => void;
  practice: () => void; result: any; practiceBusy: boolean;
}) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [progressError, setProgressError] = useState('');
  const [profileName, setProfileName] = useState(name);
  const [savingProfile, setSavingProfile] = useState(false);
  const [downloads, setDownloads] = useState<string[]>(() => JSON.parse(localStorage.getItem('speakora-downloads') || '[]'));
  const phraseList = useMemo(() => phrases.filter(p => (active !== 'Saved words' || saved.includes(p.word)) && `${p.word} ${p.meaning} ${p.use}`.toLowerCase().includes(search.toLowerCase())), [active, phrases, saved, search]);
  const categoryTag: Record<string,string> = { 'Daily life':'DAILY LIFE', Professional:'PROFESSIONAL', 'Interview prep':'INTERVIEW PREP', Engineering:'ENGINEERING', 'Group discussion':'GROUP DISCUSSION' };
  const lessonList = useMemo(() => lessons.filter(l => `${l.title} ${l.tag} ${l.desc}`.toLowerCase().includes(search.toLowerCase()) && (!categoryTag[active] || l.tag === categoryTag[active])), [active, lessons, search]);

  useEffect(() => {
    if (active !== 'My learning') return;
    if (!token) { setSessions([]); setProgressError('Sign in to see your saved learning history.'); return; }
    let cancelled = false;
    fetch(apiUrl('/api/progress'), { headers: { Authorization: `Bearer ${token}` } })
      .then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Could not load learning history.'); if (!cancelled) { setSessions(d.sessions || []); setProgressError(''); } })
      .catch(e => { if (!cancelled) setProgressError(e.message || 'Could not load learning history.'); });
    return () => { cancelled = true; };
  }, [active, token]);

  const downloadPlan = () => {
    const title = `Speakora study plan — ${new Date().toLocaleDateString()}`;
    const text = `${title}\n\n1. Practice one daily conversation (${lessons[0]?.time || '12 min'})\n2. Learn three useful vocabulary words\n3. Speak for five minutes about your day\n4. Review a GATE question and its solution\n`;
    const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' })); link.download = 'speakora-study-plan.txt'; link.click(); URL.revokeObjectURL(link.href);
    const next = downloads.includes('Speakora study plan') ? downloads : [...downloads, 'Speakora study plan'];
    setDownloads(next); localStorage.setItem('speakora-downloads', JSON.stringify(next)); notify('Study plan downloaded.');
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) { onLogin(); return; }
    setSavingProfile(true);
    try {
      const r = await fetch(apiUrl('/api/profile'), { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ name: profileName }) });
      const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Could not save profile.');
      setName(d.user.name); localStorage.setItem('speakora-name', d.user.name); notify('Profile updated.');
    } catch (e: any) { notify(e.message || 'Could not save profile.'); }
    finally { setSavingProfile(false); }
  };

  if (active === 'Vocabulary' || active === 'Saved words') return <section className="workspace-page"><div className="section-heading"><div><div className="section-kicker">YOUR WORDS</div><h2>{active === 'Saved words' ? 'Saved words' : 'Vocabulary library'}</h2><p>{active === 'Saved words' ? 'Words saved on this device.' : 'Search and save words to review later.'}</p></div></div>{phraseList.length ? <div className="vocab-grid">{phraseList.map(p => <article className="vocab-card" key={p.word}><div className="vocab-card-top"><span className="part-speech">{p.type}</span><button className={saved.includes(p.word) ? 'saved' : ''} aria-label={`Save ${p.word}`} onClick={() => onSaved(p.word)}><Bookmark size={16} fill={saved.includes(p.word) ? 'currentColor' : 'none'}/></button></div><h3>{p.word}<button aria-label={`Hear ${p.word}`} onClick={() => speak(p.word)}><Volume2 size={16}/></button></h3><div className="vocab-meaning">{p.meaning}</div><p>{p.use}</p></article>)}</div> : <div className="gate-empty"><h3>{active === 'Saved words' ? 'No saved words yet' : 'No matching words'}</h3><p>Save words from Overview and they will be available here.</p></div>}</section>;

  if (active === 'Speaking practice') return <section className="workspace-page"><div className="section-heading"><div><div className="section-kicker">SPEAKING PRACTICE</div><h2>Say it in your own words</h2><p>Type a thought or use voice input, then ask Speakora for coaching.</p></div></div><div className="builder-card"><div className="builder-input"><div className="input-label"><span>YOUR THOUGHT</span><button onClick={startMic}><Mic size={15}/> Speak instead</button></div><textarea value={sentence} onChange={e => setSentence(e.target.value)} placeholder="What would you like to say?"/><div className="builder-footer"><span>Voice input works in supported browsers.</span><button className="generate-btn" disabled={practiceBusy} onClick={practice}>{practiceBusy ? <LoaderCircle className="spin" size={15}/> : null} Get speaking feedback <ArrowRight size={15}/></button></div></div><div className="builder-output">{result ? <div><div className="output-badge">SPEAKORA COACH</div><h3>{result.corrected || result.basic}</h3><p>{result.encouragement || result.explanationHindi}</p></div> : <div className="empty-output"><h3>Your feedback will appear here.</h3><p>Speak clearly and take your time.</p></div>}</div></div></section>;

  if (active === 'My learning') return <section className="workspace-page"><div className="section-heading"><div><div className="section-kicker">YOUR PROGRESS</div><h2>My learning</h2><p>Recent practice sessions saved to your account.</p></div></div>{progressError ? <div className="gate-empty"><h3>Learning history unavailable</h3><p>{progressError}</p>{!token && <button className="secondary-btn" onClick={onLogin}>Sign in</button>}</div> : sessions.length ? <div className="question-list">{sessions.map((s:any) => <article className="gate-question" key={s._id}><div className="q-meta"><span>{s.kind}</span><span>{new Date(s.createdAt).toLocaleString()}</span></div><h3>{s.input}</h3><p>{s.output?.basic || s.output?.corrected || 'Practice completed'}</p></article>)}</div> : <div className="gate-empty"><h3>No saved practice yet</h3><p>Complete a speaking or sentence practice while signed in to see it here.</p><button className="secondary-btn" onClick={() => notify('Choose Speaking practice from the left menu to begin.')}>Got it</button></div>}</section>;

  if (active === 'Downloads') return <section className="workspace-page"><div className="section-heading"><div><div className="section-kicker">YOUR COLLECTION</div><h2>Downloads</h2><p>Create an offline copy of a simple weekly study plan.</p></div></div><div className="gate-empty"><Download size={24}/><h3>Study plan</h3><p>A short checklist for daily English practice and GATE revision.</p><button className="generate-btn" onClick={downloadPlan}>Download study plan</button></div>{downloads.length > 0 && <div className="drafts"><h3>Downloaded from Speakora</h3>{downloads.map(item => <p key={item}>{item}</p>)}</div>}</section>;

  if (active === 'Settings') return <section className="workspace-page"><div className="section-heading"><div><div className="section-kicker">ACCOUNT</div><h2>Settings</h2><p>Update your display name and appearance.</p></div></div><form className="question-form" onSubmit={saveProfile}><label className="wide-field">Display name<input value={profileName} onChange={e => setProfileName(e.target.value)} minLength={2} maxLength={80}/></label><button className="generate-btn" disabled={savingProfile}>{savingProfile ? 'Saving…' : 'Save profile'}</button><button type="button" className="secondary-btn" onClick={() => document.body.classList.toggle('light-mode')}>Toggle light/dark theme</button></form></section>;

  return <section className="workspace-page"><div className="section-heading"><div><div className="section-kicker">{active.toUpperCase()}</div><h2>{active === 'Explore learning' ? 'Explore learning' : active}</h2><p>Choose a short, practical lesson and start speaking.</p></div></div>{lessonList.length ? <div className="lesson-grid">{lessonList.map((lesson, i) => <article className={`lesson-card ${lesson.color}`} key={lesson.title}><div className="lesson-top"><span className="lesson-icon">{lesson.icon}</span><span className="lesson-tag">{lesson.tag}</span></div><h3>{lesson.title}</h3><p>{lesson.desc}</p><div className="lesson-bottom"><span>{lesson.time}</span><button className="vocab-learn" onClick={() => { setSentence(`${lesson.title}: ${lesson.desc}`); navigate('Speaking practice'); }}>Start lesson <ArrowRight size={14}/></button></div></article>)}</div> : <div className="gate-empty"><h3>No results found</h3><p>Try another search term.</p></div>}</section>;
}
