import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Bookmark, Download, ExternalLink, FileText, Image as ImageIcon, LoaderCircle, Mic, Play, Sparkles, Volume2 } from 'lucide-react';
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
  const [promptItems, setPromptItems] = useState(speakingPrompts);
  const [speakingAnswer, setSpeakingAnswer] = useState('');
  const [speakingFeedback, setSpeakingFeedback] = useState('');
  const [speakingCorrection, setSpeakingCorrection] = useState<any>(null);
  const [speakingAiError, setSpeakingAiError] = useState('');
  const [speakingBusy, setSpeakingBusy] = useState(false);
  const [promptBusy, setPromptBusy] = useState(false);
  const [mediaItems, setMediaItems] = useState<any[]>([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaError, setMediaError] = useState('');
  const [aiProvider, setAiProvider] = useState('checking');
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
  useEffect(() => {
    if (active !== 'Speaking practice') return;
    let cancelled = false;
    fetch(apiUrl('/api/practice-prompts')).then(async r => { const d=await r.json(); if(!r.ok)throw new Error(d.error||'Prompt list unavailable'); if(!cancelled&&Array.isArray(d.items)&&d.items.length){setPromptItems(d.items);setSpeakingTopic(d.items[0]);} }).catch(()=>{});
    return () => { cancelled=true; };
  }, [active]);
  useEffect(() => {
    if (active !== 'Media library') return;
    let cancelled = false; setMediaLoading(true); setMediaError('');
    fetch(apiUrl('/api/media')).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error||'Could not load media.');if(!cancelled)setMediaItems(Array.isArray(d.items)?d.items:[]);}).catch((e:any)=>{if(!cancelled){setMediaItems([]);setMediaError(e.message||'Could not load media.');}}).finally(()=>{if(!cancelled)setMediaLoading(false)});
    return()=>{cancelled=true};
  },[active]);
  useEffect(() => {
    if (active !== 'Speaking practice') return;
    let cancelled=false;
    fetch(apiUrl('/api/health')).then(r=>r.json()).then(d=>{if(!cancelled)setAiProvider(d.aiProvider||'not-configured')}).catch(()=>{if(!cancelled)setAiProvider('unreachable')});
    return()=>{cancelled=true};
  },[active]);

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

  if (active === 'Media library') return <section className="workspace-page"><div className="section-heading"><div><div className="section-kicker">LEARNING RESOURCES</div><h2>Media library</h2><p>Images, videos and documents shared by your learning team.</p></div></div>{mediaLoading?<div className="gate-empty"><LoaderCircle className="spin"/>Loading learning resources…</div>:mediaError?<div className="gate-empty"><h3>Media library unavailable</h3><p>{mediaError}</p></div>:mediaItems.length?<div className="media-library-grid">{mediaItems.map((item:any)=><article className="media-library-card" key={item._id}>{item.resourceType==='image'&&item.format?.toLowerCase()!=='pdf'?<a href={item.url} target="_blank" rel="noreferrer" className="media-preview"><img src={item.url} alt={item.title}/></a>:item.resourceType==='video'?<video className="media-preview" controls preload="metadata" src={item.url} aria-label={item.title}/>:<div className="media-file-preview">{item.format?.toLowerCase()==='pdf'?<FileText size={32}/>:<ImageIcon size={32}/>}<span>{item.format?.toUpperCase()||'FILE'}</span></div>}<div className="media-library-copy"><div className="q-meta"><span>{item.category}</span><span>{item.format?.toUpperCase()||item.resourceType}</span></div><h3>{item.title}</h3>{item.description&&<p>{item.description}</p>}<a className="media-open-link" href={item.url} target="_blank" rel="noreferrer">{item.resourceType==='video'?<Play size={14}/>:<ExternalLink size={14}/>} Open resource</a></div></article>)}</div>:<div className="gate-empty"><ImageIcon size={28}/><h3>No learning media yet</h3><p>Resources published by the Speakora admin will appear here.</p></div>}</section>;

  if (active === 'Speaking practice') {
    const generateSpeakingPrompt = async () => {
      setPromptBusy(true);
      try {
        const r = await fetch(apiUrl('/api/learn/speaking-prompt'), { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ topic: speakingTopic.topic, previous: speakingAnswer || undefined }) });
        const d = await r.json().catch(()=>null); if(!d)throw new Error('The API returned HTML instead of JSON. Check VITE_API_URL on the frontend service.'); if (!r.ok) throw new Error(d.error || `AI prompt request failed (${r.status}).`);
        setSpeakingTopic({ topic: 'AI follow-up', question: d.prompt, sample: 'Answer in your own words. Try to give one clear reason and one example.', tip: 'Speak for 30–60 seconds. Use a complete sentence, then add a reason or example.' });
        setSpeakingAnswer(''); setSpeakingFeedback(''); setSpeakingCorrection(null); setSpeakingAiError(''); setShowSample(false); notify('Your AI speaking prompt is ready.');
      } catch (error: any) { setSpeakingAiError(error.message||'AI prompt unavailable. Check the backend AI key and database connection.'); }
      finally { setPromptBusy(false); }
    };
    const finishPractice = async () => {
      const wordCount = speakingAnswer.trim().split(/\s+/).filter(Boolean).length;
      if (wordCount < 5) { notify('Say or type at least five words before completing this practice.'); return; }
      setSpeakingBusy(true); setSpeakingCorrection(null); setSpeakingAiError('');
      let message = wordCount >= 12 ? 'Good detail. You used enough words to explain your idea clearly.' : 'Good start. Add one more reason or example to make your answer stronger.';
      try {
        const r = await fetch(apiUrl('/api/learn/correct'), { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ text: speakingAnswer }) });
        const d = await r.json().catch(()=>null); if(!d)throw new Error('The API returned HTML instead of JSON. Check VITE_API_URL on the frontend service.'); if (!r.ok) throw new Error(d.error || `AI feedback request failed (${r.status}).`);
        setSpeakingCorrection(d.result); message = d.result.encouragement || message;
      } catch (error:any) { setSpeakingAiError(error.message||'AI feedback could not be generated. Check the backend AI settings.'); }
      const history = JSON.parse(localStorage.getItem('speakora-speaking-sessions') || '[]');
      history.unshift({ topic: speakingTopic.topic, prompt: speakingTopic.question, answer: speakingAnswer, wordCount, completedAt: new Date().toISOString() });
      localStorage.setItem('speakora-speaking-sessions', JSON.stringify(history.slice(0, 30)));
      setSpeakingFeedback(message); setSpeakingBusy(false);
    };
    return <section className="workspace-page"><div className="section-heading"><div><div className="section-kicker">SPEAKING PRACTICE · {promptItems.length} PROMPTS</div><h2>Say it in your own words</h2><p>Choose a prompt, speak or type your answer, then get AI feedback on clarity and grammar.</p></div><button className="secondary-btn" disabled={promptBusy} onClick={()=>void generateSpeakingPrompt()}>{promptBusy?<LoaderCircle size={14} className="spin"/>:<Sparkles size={14}/>} Ask AI for a follow-up</button></div><div className={`speaking-ai-status ${aiProvider==='not-configured'||aiProvider==='unreachable'?'is-warning':''}`}>{aiProvider==='checking'?'Checking AI service…':aiProvider==='not-configured'?'AI provider key is not configured on the backend. Add OPENROUTER_API_KEY in Render.':aiProvider==='unreachable'?'AI service status could not be reached. Check VITE_API_URL and backend health.':`AI provider configured: ${aiProvider} · ${aiProvider==='openrouter'?'OpenRouter model selected':'OpenAI model selected'}`}</div>{speakingAiError&&<div className="auth-error speaking-ai-error">{speakingAiError}</div>}<div className="speaking-prompts">{promptItems.map(item=><button key={item.topic} className={`secondary-btn ${speakingTopic.topic===item.topic?'active':''}`} onClick={()=>{setSpeakingTopic(item);setSpeakingAnswer('');setSpeakingFeedback('');setSpeakingCorrection(null);setSpeakingAiError('');setShowSample(false)}}>{item.topic}</button>)}</div><article className="gate-question speaking-question"><div className="q-meta"><span>YOUR PROMPT</span><span>{speakingTopic.topic}</span></div><h3>{speakingTopic.question}</h3><p className="speaking-tip">{speakingTopic.tip}</p><textarea className="speaking-answer" value={speakingAnswer} onChange={e=>{setSpeakingAnswer(e.target.value);setSpeakingFeedback('');setSpeakingCorrection(null);setSpeakingAiError('')}} placeholder="Type your answer here, or use the microphone…"/><div className="speaking-actions"><button className="secondary-btn" onClick={()=>startMic(setSpeakingAnswer,'en-US')}><Mic size={15}/> Speak answer</button><button className="secondary-btn" onClick={()=>speak(speakingTopic.sample)}><Volume2 size={15}/> Listen to sample</button><button className="generate-btn" disabled={speakingBusy} onClick={()=>void finishPractice()}>{speakingBusy?<><LoaderCircle size={14} className="spin"/> Checking…</>:<>Get AI feedback <ArrowRight size={15}/></>}</button></div>{speakingFeedback&&<div className="solution-panel"><b>{speakingAnswer.trim().split(/\s+/).filter(Boolean).length} words</b><p>{speakingFeedback}</p>{speakingCorrection?.corrected&&<><h4>Suggested correction</h4><p>{speakingCorrection.corrected}</p></>}{speakingCorrection?.explanationHindi&&<p lang="hi">{speakingCorrection.explanationHindi}</p>}{speakingCorrection?.tryAgain&&<><h4>Try again</h4><p>{speakingCorrection.tryAgain}</p></>}</div>}<button className="solution-btn" onClick={()=>setShowSample(!showSample)}>{showSample?'Hide sample answer':'Show sample answer'} <ArrowRight size={14}/></button>{showSample&&<div className="solution-panel"><h4>Sample answer</h4><p>{speakingTopic.sample}</p></div>}</article></section>;
  }

  if (active === 'My learning') return <section className="workspace-page"><div className="section-heading"><div><div className="section-kicker">YOUR PROGRESS</div><h2>My learning</h2><p>Practice history saved to your account and this device.</p></div></div>{progressError&&<div className="gate-empty"><h3>Account history unavailable</h3><p>{progressError}</p></div>}{!token&&<div className="admin-auth-callout">Sign in to sync sentence practice across devices. <button onClick={onLogin}>Sign in</button></div>}{sessions.map((s:any)=><article className="gate-question" key={s._id}><div className="q-meta"><span>{s.kind}</span><span>{new Date(s.createdAt).toLocaleString()}</span></div><h3>{s.input}</h3><p>{s.output?.basic || s.output?.corrected || 'Practice completed'}</p></article>)}{speakingSessions.map((s:any,i:number)=><article className="gate-question" key={`${s.completedAt}-${i}`}><div className="q-meta"><span>speaking · {s.wordCount} words</span><span>{new Date(s.completedAt).toLocaleString()}</span></div><h3>{s.prompt}</h3><p>{s.answer}</p></article>)}{!sessions.length&&!speakingSessions.length&&!progressError&&<div className="gate-empty"><h3>No saved practice yet</h3><p>Complete a speaking prompt to start your history.</p><button className="secondary-btn" onClick={()=>navigate('Speaking practice')}>Start speaking practice</button></div>}</section>;

  if (active === 'Downloads') return <section className="workspace-page"><div className="section-heading"><div><div className="section-kicker">YOUR COLLECTION</div><h2>Downloads</h2><p>Create an offline copy of a simple weekly study plan.</p></div></div><div className="gate-empty"><Download size={24}/><h3>Study plan</h3><p>A short checklist for daily English practice and GATE revision.</p><button className="generate-btn" onClick={downloadPlan}>Download study plan</button></div>{downloads.length > 0 && <div className="drafts"><h3>Downloaded from Speakora</h3>{downloads.map(item => <p key={item}>{item}</p>)}</div>}</section>;

  if (active === 'Settings') return <section className="workspace-page"><div className="section-heading"><div><div className="section-kicker">ACCOUNT</div><h2>Settings</h2><p>Update your display name and appearance.</p></div></div><form className="question-form" onSubmit={saveProfile}><label className="wide-field">Display name<input value={profileName} onChange={e => setProfileName(e.target.value)} minLength={2} maxLength={80}/></label><button className="generate-btn" disabled={savingProfile}>{savingProfile ? 'Saving…' : 'Save profile'}</button><button type="button" className="secondary-btn" onClick={() => document.body.classList.toggle('light-mode')}>Toggle light/dark theme</button></form></section>;

  return <section className="workspace-page"><div className="section-heading"><div><div className="section-kicker">{active.toUpperCase()}</div><h2>{active === 'Explore learning' ? 'Explore learning' : active}</h2><p>Choose a short, practical lesson and start speaking.</p></div></div>{lessonList.length ? <div className="lesson-grid">{lessonList.map((lesson, i) => <article className={`lesson-card ${lesson.color}`} key={lesson.title}><div className="lesson-top"><span className="lesson-icon">{lesson.icon}</span><span className="lesson-tag">{lesson.tag}</span></div><h3>{lesson.title}</h3><p>{lesson.desc}</p><div className="lesson-bottom"><span>{lesson.time}</span><button className="vocab-learn" onClick={() => { setSentence(`${lesson.title}: ${lesson.desc}`); navigate('Speaking practice'); }}>Start lesson <ArrowRight size={14}/></button></div></article>)}</div> : <div className="gate-empty"><h3>No results found</h3><p>Try another search term.</p></div>}</section>;
}

