import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Bookmark, Download, LoaderCircle, Mic, Volume2 } from 'lucide-react';
import { apiUrl } from './api';

type Phrase = { word: string; meaning: string; use: string; type: string };
type Lesson = { icon: string; title: string; tag: string; time: string; color: string; desc: string };
const speakingPrompts = [
  { topic: 'Introduce yourself', question: 'Tell me about yourself and one thing you enjoy learning.', sample: 'My name is Asha. I work as a designer, and I enjoy learning how people use technology. In my free time, I like reading and spending time with my family.', tip: 'Use your name, one detail about work or study, and one personal interest.' },
  { topic: 'Daily routine', question: 'Describe a typical day in your life.', sample: 'I usually start my day with breakfast and a short walk. I work in the morning, take a break in the afternoon, and spend the evening with my family.', tip: 'Use sequence words such as usually, then, after that, and finally.' },
  { topic: 'A memorable place', question: 'Describe a place you visited and explain why you remember it.', sample: 'I remember visiting Jaipur with my cousins. The old buildings were beautiful, and we tried local food together. I would like to visit again.', tip: 'Mention where it is, what you saw, and how you felt.' },
  { topic: 'Learning goal', question: 'What skill would you like to learn, and how will you practise it?', sample: 'I would like to improve my English speaking. I plan to practise for fifteen minutes every day, listen to short conversations, and speak with a friend.', tip: 'State the goal, your plan, and how often you will practise.' },
  { topic: 'Solve a challenge', question: 'Talk about a challenge you faced and how you handled it.', sample: 'I once had to finish a project with a short deadline. I listed the important tasks, asked my teammate for help, and completed the work on time.', tip: 'Explain the situation, what you did, and what you learned.' },
  { topic: 'Workplace opinion', question: 'What makes communication effective in a team?', sample: 'I think clear communication helps a team work well. People should share updates early, listen carefully, and ask questions when something is unclear.', tip: 'Give your opinion, then support it with two practical reasons.' },
  { topic: 'Explain technology', question: 'Explain a piece of technology you use often to someone unfamiliar with it.', sample: 'A smartphone is a small computer that fits in your pocket. I use it to make calls, read messages, find directions, and learn new things online.', tip: 'Describe what it is, how it works, and one useful example.' },
  { topic: 'Group discussion', question: 'Do you think online learning is useful? Give your view and respond to another opinion.', sample: 'I think online learning is useful because it gives people flexible access to lessons. I agree that students need discipline, so a clear schedule can help them stay focused.', tip: 'State your view, acknowledge another side, and add a reason.' },
];

export default function WorkspaceView({ active, search, phrases, lessons, saved, onSaved, notify, speak, name, setName, navigate, token, onLogin, sentence, setSentence, startMic, practice, result, practiceBusy }: {
  active: string; search: string; phrases: Phrase[]; lessons: Lesson[]; saved: string[]; onSaved: (word: string) => void;
  notify: (message: string) => void; speak: (text: string) => void; name: string; setName: (name: string) => void; navigate: (page: string) => void;
  token: string; onLogin: () => void; sentence: string; setSentence: (value: string) => void; startMic: (onTranscript?: (text: string) => void, language?: string) => void;
  practice: () => void; result: any; practiceBusy: boolean;
}) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [speakingSessions, setSpeakingSessions] = useState<any[]>([]);
  const [progressError, setProgressError] = useState('');
  const [profileName, setProfileName] = useState(name);
  const [savingProfile, setSavingProfile] = useState(false);
  const [downloads, setDownloads] = useState<string[]>(() => JSON.parse(localStorage.getItem('speakora-downloads') || '[]'));
  const [speakingTopic, setSpeakingTopic] = useState(speakingPrompts[0]);
  const [speakingAnswer, setSpeakingAnswer] = useState('');
  const [speakingFeedback, setSpeakingFeedback] = useState('');
  const [showSample, setShowSample] = useState(false);
  const phraseList = useMemo(() => phrases.filter(p => (active !== 'Saved words' || saved.includes(p.word)) && `${p.word} ${p.meaning} ${p.use}`.toLowerCase().includes(search.toLowerCase())), [active, phrases, saved, search]);
  const categoryTag: Record<string,string> = { 'Daily life':'DAILY LIFE', Professional:'PROFESSIONAL', 'Interview prep':'INTERVIEW PREP', Engineering:'ENGINEERING', 'Group discussion':'GROUP DISCUSSION' };
  const lessonList = useMemo(() => lessons.filter(l => `${l.title} ${l.tag} ${l.desc}`.toLowerCase().includes(search.toLowerCase()) && (!categoryTag[active] || l.tag === categoryTag[active])), [active, lessons, search]);

  useEffect(() => {
    if (active !== 'My learning') return;
    setSpeakingSessions(JSON.parse(localStorage.getItem('speakora-speaking-sessions') || '[]'));
    if (!token) { setSessions([]); setProgressError(''); return; }
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

  if (active === 'Speaking practice') {
    const finishPractice = () => {
      const wordCount = speakingAnswer.trim().split(/\s+/).filter(Boolean).length;
      if (wordCount < 5) { notify('Say or type at least five words before completing this practice.'); return; }
      const message = wordCount >= 12 ? 'Good detail. You used enough words to explain your idea clearly.' : 'Good start. Add one more reason or example to make your answer stronger.';
      const history = JSON.parse(localStorage.getItem('speakora-speaking-sessions') || '[]');
      history.unshift({ topic: speakingTopic.topic, prompt: speakingTopic.question, answer: speakingAnswer, wordCount, completedAt: new Date().toISOString() });
      localStorage.setItem('speakora-speaking-sessions', JSON.stringify(history.slice(0, 30)));
      setSpeakingFeedback(message); notify('Speaking practice saved on this device.');
    };
    return <section className="workspace-page"><div className="section-heading"><div><div className="section-kicker">SPEAKING PRACTICE · {speakingPrompts.length} PROMPTS</div><h2>Say it in your own words</h2><p>Choose a prompt, record or type your answer, then compare with a sample response.</p></div></div><div className="speaking-prompts">{speakingPrompts.map(item=><button key={item.topic} className={`secondary-btn ${speakingTopic.topic===item.topic?'active':''}`} onClick={()=>{setSpeakingTopic(item);setSpeakingAnswer('');setSpeakingFeedback('');setShowSample(false)}}>{item.topic}</button>)}</div><article className="gate-question speaking-question"><div className="q-meta"><span>YOUR PROMPT</span><span>{speakingTopic.topic}</span></div><h3>{speakingTopic.question}</h3><p className="speaking-tip">{speakingTopic.tip}</p><textarea className="speaking-answer" value={speakingAnswer} onChange={e=>{setSpeakingAnswer(e.target.value);setSpeakingFeedback('')}} placeholder="Type your answer here, or use the microphone…"/><div className="speaking-actions"><button className="secondary-btn" onClick={()=>startMic(setSpeakingAnswer,'en-US')}><Mic size={15}/> Speak answer</button><button className="secondary-btn" onClick={()=>speak(speakingTopic.sample)}><Volume2 size={15}/> Listen to sample</button><button className="generate-btn" onClick={finishPractice}>Finish practice <ArrowRight size={15}/></button></div>{speakingFeedback&&<div className="solution-panel"><b>{speakingAnswer.trim().split(/\s+/).filter(Boolean).length} words</b><p>{speakingFeedback}</p></div>}<button className="solution-btn" onClick={()=>setShowSample(!showSample)}>{showSample?'Hide sample answer':'Show sample answer'} <ArrowRight size={14}/></button>{showSample&&<div className="solution-panel"><h4>Sample answer</h4><p>{speakingTopic.sample}</p></div>}</article></section>;
  }

  if (active === 'My learning') return <section className="workspace-page"><div className="section-heading"><div><div className="section-kicker">YOUR PROGRESS</div><h2>My learning</h2><p>Practice history saved to your account and this device.</p></div></div>{progressError&&<div className="gate-empty"><h3>Account history unavailable</h3><p>{progressError}</p></div>}{!token&&<div className="admin-auth-callout">Sign in to sync sentence practice across devices. <button onClick={onLogin}>Sign in</button></div>}{sessions.map((s:any)=><article className="gate-question" key={s._id}><div className="q-meta"><span>{s.kind}</span><span>{new Date(s.createdAt).toLocaleString()}</span></div><h3>{s.input}</h3><p>{s.output?.basic || s.output?.corrected || 'Practice completed'}</p></article>)}{speakingSessions.map((s:any,i:number)=><article className="gate-question" key={`${s.completedAt}-${i}`}><div className="q-meta"><span>speaking · {s.wordCount} words</span><span>{new Date(s.completedAt).toLocaleString()}</span></div><h3>{s.prompt}</h3><p>{s.answer}</p></article>)}{!sessions.length&&!speakingSessions.length&&!progressError&&<div className="gate-empty"><h3>No saved practice yet</h3><p>Complete a speaking prompt to start your history.</p><button className="secondary-btn" onClick={()=>navigate('Speaking practice')}>Start speaking practice</button></div>}</section>;

  if (active === 'Downloads') return <section className="workspace-page"><div className="section-heading"><div><div className="section-kicker">YOUR COLLECTION</div><h2>Downloads</h2><p>Create an offline copy of a simple weekly study plan.</p></div></div><div className="gate-empty"><Download size={24}/><h3>Study plan</h3><p>A short checklist for daily English practice and GATE revision.</p><button className="generate-btn" onClick={downloadPlan}>Download study plan</button></div>{downloads.length > 0 && <div className="drafts"><h3>Downloaded from Speakora</h3>{downloads.map(item => <p key={item}>{item}</p>)}</div>}</section>;

  if (active === 'Settings') return <section className="workspace-page"><div className="section-heading"><div><div className="section-kicker">ACCOUNT</div><h2>Settings</h2><p>Update your display name and appearance.</p></div></div><form className="question-form" onSubmit={saveProfile}><label className="wide-field">Display name<input value={profileName} onChange={e => setProfileName(e.target.value)} minLength={2} maxLength={80}/></label><button className="generate-btn" disabled={savingProfile}>{savingProfile ? 'Saving…' : 'Save profile'}</button><button type="button" className="secondary-btn" onClick={() => document.body.classList.toggle('light-mode')}>Toggle light/dark theme</button></form></section>;

  return <section className="workspace-page"><div className="section-heading"><div><div className="section-kicker">{active.toUpperCase()}</div><h2>{active === 'Explore learning' ? 'Explore learning' : active}</h2><p>Choose a short, practical lesson and start speaking.</p></div></div>{lessonList.length ? <div className="lesson-grid">{lessonList.map((lesson, i) => <article className={`lesson-card ${lesson.color}`} key={lesson.title}><div className="lesson-top"><span className="lesson-icon">{lesson.icon}</span><span className="lesson-tag">{lesson.tag}</span></div><h3>{lesson.title}</h3><p>{lesson.desc}</p><div className="lesson-bottom"><span>{lesson.time}</span><button className="vocab-learn" onClick={() => { setSentence(`${lesson.title}: ${lesson.desc}`); navigate('Speaking practice'); }}>Start lesson <ArrowRight size={14}/></button></div></article>)}</div> : <div className="gate-empty"><h3>No results found</h3><p>Try another search term.</p></div>}</section>;
}
