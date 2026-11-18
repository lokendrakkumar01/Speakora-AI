import { useEffect, useState } from 'react';
import { ArrowRight, FileUp, Pencil, Plus, RefreshCw, Trash2, X } from 'lucide-react';
import { apiUrl } from './api';

type ContentItem = Record<string, any> & { _id?: string; title?: string; word?: string; topic?: string; status?: string };
const emptyTopic = { title: '', category: 'Daily life', difficulty: 'beginner', description: '', status: 'draft' };
const emptyWord = { word: '', category: 'Daily life', meaningHindi: '', definition: '', example: '', difficulty: 'beginner', status: 'draft' };
const emptyPrompt = { topic: '', category: 'Speaking', question: '', sample: '', tip: '', status: 'draft' };

export default function AdminDashboard({ token, notify }: { token: string; notify: (message: string) => void }) {
  const [section, setSection] = useState<'lessons'|'vocabulary'|'speaking'|'media'>('lessons');
  const [items, setItems] = useState<ContentItem[]>([]);
  const [form, setForm] = useState<ContentItem>(emptyTopic);
  const [editing, setEditing] = useState('');
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File|null>(null);
  const [asset, setAsset] = useState('');
  const [error, setError] = useState('');
  const endpoint = section === 'lessons' ? '/api/admin/topics' : section === 'vocabulary' ? '/api/admin/vocabulary' : '/api/admin/practice-prompts';
  const emptyForm = () => section === 'lessons' ? emptyTopic : section === 'vocabulary' ? emptyWord : emptyPrompt;
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const load = async () => {
    if (section === 'media') return;
    setLoading(true); setError('');
    try { const r = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}` } }); const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Could not load admin content.'); setItems(d.items || []); }
    catch (e:any) { setItems([]); setError(e.message || 'Could not load admin content.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { setItems([]); setForm(emptyForm()); setEditing(''); void load(); }, [section, token]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError('');
    try { const r = await fetch(editing ? `${endpoint}/${editing}` : endpoint, { method: editing ? 'PATCH' : 'POST', headers, body: JSON.stringify(form) }); const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Could not save item.'); notify(editing ? 'Changes saved.' : 'Content added.'); setForm(emptyForm()); setEditing(''); await load(); }
    catch (e:any) { setError(e.message || 'Could not save item.'); }
    finally { setLoading(false); }
  };
  const edit = (item: ContentItem) => { setEditing(item._id || ''); setForm({...emptyForm(), ...item}); window.scrollTo({top:0,behavior:'smooth'}); };
  const remove = async (id?: string) => { if (!id || !window.confirm('Delete this item permanently?')) return; try { const r=await fetch(`${endpoint}/${id}`,{method:'DELETE',headers:{Authorization:`Bearer ${token}`}});const d=await r.json();if(!r.ok)throw new Error(d.error||'Could not delete item.');notify('Item deleted.');await load(); } catch(e:any) { setError(e.message||'Could not delete item.'); } };
  const upload = async (e:React.FormEvent) => { e.preventDefault(); if(!file)return; setLoading(true);setError('');try{const data=new FormData();data.append('file',file);const r=await fetch(apiUrl('/api/admin/media'),{method:'POST',headers:{Authorization:`Bearer ${token}`},body:data});const d=await r.json();if(!r.ok)throw new Error(d.error||'Upload failed.');setAsset(d.asset.url);notify('Media uploaded to Cloudinary.')}catch(e:any){setError(e.message||'Upload failed.')}finally{setLoading(false)} };

  const tabs = [['lessons','Lessons'],['vocabulary','Vocabulary'],['speaking','Speaking prompts'],['media','Media upload']] as const;
  return <section className="admin-dashboard"><div className="section-heading"><div><div className="section-kicker">ADMIN WORKSPACE</div><h2>Manage Speakora content</h2><p>Add, edit, publish, archive, and delete learner content. Changes are saved in MongoDB.</p></div><button className="secondary-btn" onClick={()=>void load()}><RefreshCw size={14}/> Refresh</button></div>
    <div className="admin-tabs">{tabs.map(([key,label])=><button key={key} className={`secondary-btn ${section===key?'active':''}`} onClick={()=>setSection(key)}>{label}</button>)}</div>
    {error&&<div className="auth-error admin-error">{error}</div>}
    {section==='media'?<form className="question-form admin-form" onSubmit={upload}><h3 className="wide-field">Upload a learning image, PDF, or video</h3><label className="wide-field">Media file<input type="file" accept="image/jpeg,image/png,image/webp,application/pdf,video/mp4" onChange={e=>setFile(e.target.files?.[0]||null)}/></label><p className="wide-field admin-note-text">Maximum 20 MB. Cloudinary must be configured on the backend.</p><button className="generate-btn" disabled={loading||!file}>{loading?'Uploading…':<><FileUp size={15}/> Upload</>}</button>{asset&&<a className="wide-field" href={asset} target="_blank" rel="noreferrer">Open uploaded media <ArrowRight size={14}/></a>}</form>:<div className="admin-content-grid"><form className="question-form admin-form" onSubmit={save}><h3 className="wide-field">{editing?'Edit item':`Add ${section==='lessons'?'lesson':section==='vocabulary'?'word':'speaking prompt'}`}</h3>
      {section==='lessons'&&<><label>Title<input required maxLength={120} value={form.title||''} onChange={e=>setForm({...form,title:e.target.value})}/></label><label>Category<input required maxLength={80} value={form.category||''} onChange={e=>setForm({...form,category:e.target.value})}/></label><label>Difficulty<select value={form.difficulty||'beginner'} onChange={e=>setForm({...form,difficulty:e.target.value})}><option>beginner</option><option>intermediate</option><option>advanced</option></select></label><label>Status<select value={form.status||'draft'} onChange={e=>setForm({...form,status:e.target.value})}><option>draft</option><option>pending-review</option><option>published</option><option>archived</option></select></label><label className="wide-field">Description<textarea required maxLength={10000} rows={4} value={form.description||''} onChange={e=>setForm({...form,description:e.target.value})}/></label></>}
      {section==='vocabulary'&&<><label>Word<input required maxLength={100} value={form.word||''} onChange={e=>setForm({...form,word:e.target.value})}/></label><label>Category<input required maxLength={80} value={form.category||''} onChange={e=>setForm({...form,category:e.target.value})}/></label><label>Hindi meaning<input maxLength={250} value={form.meaningHindi||''} onChange={e=>setForm({...form,meaningHindi:e.target.value})}/></label><label>Difficulty<select value={form.difficulty||'beginner'} onChange={e=>setForm({...form,difficulty:e.target.value})}><option>beginner</option><option>intermediate</option><option>advanced</option></select></label><label className="wide-field">Definition<textarea rows={3} value={form.definition||''} onChange={e=>setForm({...form,definition:e.target.value})}/></label><label className="wide-field">Example<input maxLength={1000} value={form.example||''} onChange={e=>setForm({...form,example:e.target.value})}/></label><label>Status<select value={form.status||'draft'} onChange={e=>setForm({...form,status:e.target.value})}><option>draft</option><option>published</option><option>archived</option></select></label></>}
      {section==='speaking'&&<><label>Topic<input required maxLength={100} value={form.topic||''} onChange={e=>setForm({...form,topic:e.target.value})}/></label><label>Category<input required maxLength={80} value={form.category||''} onChange={e=>setForm({...form,category:e.target.value})}/></label><label className="wide-field">Practice question<textarea required rows={3} value={form.question||''} onChange={e=>setForm({...form,question:e.target.value})}/></label><label className="wide-field">Sample answer<textarea required rows={4} value={form.sample||''} onChange={e=>setForm({...form,sample:e.target.value})}/></label><label className="wide-field">Learner tip<textarea required rows={2} value={form.tip||''} onChange={e=>setForm({...form,tip:e.target.value})}/></label><label>Status<select value={form.status||'draft'} onChange={e=>setForm({...form,status:e.target.value})}><option>draft</option><option>published</option><option>archived</option></select></label></>}
      <button className="generate-btn" disabled={loading}>{loading?'Saving…':editing?'Save changes':<><Plus size={15}/> Save draft</>}</button>{editing&&<button type="button" className="secondary-btn" onClick={()=>{setForm(emptyForm());setEditing('')}}><X size={14}/> Cancel edit</button>}</form>
      <div className="admin-items"><div className="draft-header"><h3>{section==='lessons'?'Lessons':section==='vocabulary'?'Vocabulary':'Speaking prompts'}</h3><span>{items.length} items</span></div>{loading&&!items.length?<p>Loading…</p>:items.length?items.map(item=><article className="admin-item" key={item._id}><div><b>{item.title||item.word||item.topic}</b><small>{item.status||'draft'} · {item.category}{item.question?` · ${item.question}`:''}</small></div><button className="publish-btn" onClick={()=>edit(item)} aria-label="Edit item"><Pencil size={14}/></button><button className="delete-btn" onClick={()=>void remove(item._id)} aria-label="Delete item"><Trash2 size={14}/></button></article>):<p>No items yet. Add the first one.</p>}</div></div>}
  </section>;
}

