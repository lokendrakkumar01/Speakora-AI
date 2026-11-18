import { useEffect, useState } from 'react';
import { ArrowRight, Download, FileUp, LoaderCircle, Pencil, Plus, RefreshCw, Search, ShieldCheck, Sparkles, Trash2, Upload, X } from 'lucide-react';
import { apiUrl } from './api';

type ContentItem = Record<string, any> & { _id?: string; title?: string; word?: string; topic?: string; status?: string };
const emptyTopic = { title: '', category: 'Daily life', difficulty: 'beginner', description: '', visualExplanation: '', voiceScript: '', vocabulary: '[]', sentences: '[]', exercises: '[]', questions: '[]', status: 'draft' };
const emptyWord = { word: '', category: 'Daily life', meaningHindi: '', definition: '', partOfSpeech: '', pronunciation: '', example: '', translationHindi: '', whereToUse: '', whereNotToUse: '', difficulty: 'beginner', status: 'draft' };
const emptyPrompt = { topic: '', category: 'Speaking', question: '', sample: '', tip: '', status: 'draft' };
const emptyMedia = { title: '', category: 'Daily life', description: '', status: 'published' };
const categoriesBySection = {
  lessons: ['Daily life','Professional','Interview prep','Engineering','Group discussion','Grammar','GATE Practice','Other / custom'],
  vocabulary: ['Daily life','Professional','Academic','Interview prep','Engineering','GATE Aptitude','Other / custom'],
  speaking: ['Speaking','Daily life','Professional','Interview prep','Group discussion','Debate','Other / custom'],
};

async function requestJson(path: string, init: RequestInit = {}) {
  const response = await fetch(apiUrl(path), init);
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(`The API returned a webpage instead of JSON (${response.status}). Set VITE_API_URL in the frontend service to your backend's Render URL, then redeploy the frontend.`);
  }
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status}).`);
  return data;
}

export default function AdminDashboard({ token, notify, onOpenGate }: { token: string; notify: (message: string) => void; onOpenGate: () => void }) {
  const [section, setSection] = useState<'lessons'|'vocabulary'|'speaking'|'media'>('lessons');
  const [items, setItems] = useState<ContentItem[]>([]);
  const [form, setForm] = useState<ContentItem>(emptyTopic);
  const [editing, setEditing] = useState('');
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File|null>(null);
  const [asset, setAsset] = useState('');
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [importText, setImportText] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [importing, setImporting] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [syncingMedia, setSyncingMedia] = useState(false);
  const endpoint = section === 'lessons' ? '/api/admin/topics' : section === 'vocabulary' ? '/api/admin/vocabulary' : section === 'speaking' ? '/api/admin/practice-prompts' : '/api/admin/media';
  const emptyForm = () => section === 'lessons' ? emptyTopic : section === 'vocabulary' ? emptyWord : section === 'speaking' ? emptyPrompt : emptyMedia;
  const categoryChoices = section === 'media' ? [] : categoriesBySection[section];
  const setCategory = (value: string) => { if (value !== 'Other / custom') setForm({ ...form, category: value }); };
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const load = async () => {
    setLoading(true); setError('');
    try { const d = await requestJson(endpoint, { headers: { Authorization: `Bearer ${token}` } }); setItems(d.items || []); }
    catch (e:any) { setItems([]); setError(e.message || 'Could not load admin content.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { setItems([]); setForm(emptyForm()); setEditing(''); void load(); }, [section, token]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      const payload: ContentItem = { ...form };
      if (section === 'lessons') for (const field of ['vocabulary', 'sentences', 'exercises', 'questions']) {
        const value = payload[field];
        payload[field] = typeof value === 'string' ? JSON.parse(value || '[]') : value || [];
        if (!Array.isArray(payload[field])) throw new Error(`${field} must be a JSON array.`);
      }
      const d = await requestJson(editing ? `${endpoint}/${editing}` : endpoint, { method: editing ? 'PATCH' : 'POST', headers, body: JSON.stringify(payload) });
      notify(editing ? 'Changes saved.' : 'Content added.'); setForm(emptyForm()); setEditing(''); await load();
    }
    catch (e:any) { setError(e.message || 'Could not save item.'); }
    finally { setLoading(false); }
  };
  const edit = (item: ContentItem) => {
    const values: ContentItem = {...item};
    if (section === 'lessons') for (const field of ['vocabulary', 'sentences', 'exercises', 'questions']) values[field] = JSON.stringify(item[field] || [], null, 2);
    setEditing(item._id || ''); setForm({...emptyForm(), ...values}); window.scrollTo({top:0,behavior:'smooth'});
  };
  const remove = async (id?: string) => { if (!id || !window.confirm('Delete this item permanently?')) return; try { await requestJson(`${endpoint}/${id}`,{method:'DELETE',headers:{Authorization:`Bearer ${token}`}});notify('Item deleted.');await load(); } catch(e:any) { setError(e.message||'Could not delete item.'); } };
  const upload = async (e:React.FormEvent) => { e.preventDefault(); if(!file&&!editing){setError('Choose a media file to upload.');return;} setLoading(true);setError('');try{if(editing){await requestJson(`/api/admin/media/${editing}`,{method:'PATCH',headers,body:JSON.stringify(form)});notify('Media details updated.');setEditing('');setForm(emptyMedia)}else{const data=new FormData();data.append('file',file!);for(const [key,value] of Object.entries(form))data.append(key,String(value??''));const d=await requestJson('/api/admin/media',{method:'POST',headers:{Authorization:`Bearer ${token}`},body:data});setAsset(d.item.url);notify(form.status==='published'?'Media uploaded and published for learners.':'Media uploaded as a draft.')}setFile(null);await load()}catch(e:any){setError(e.message||'Upload failed.')}finally{setLoading(false)} };
  const syncMedia = async () => { setSyncingMedia(true);setError('');try{const d=await requestJson('/api/admin/media/sync',{method:'POST',headers:{Authorization:`Bearer ${token}`}});notify(`Added ${d.created} existing Cloudinary item(s) to the learner library; ${d.skipped} already linked.`);await load()}catch(e:any){setError(e.message||'Could not sync Cloudinary media.')}finally{setSyncingMedia(false)} };
  const generateWithAI = async () => {
    setAiGenerating(true); setError('');
    try {
      if (section === 'vocabulary') {
        const d = await requestJson('/api/admin/vocabulary/generate', { method: 'POST', headers, body: JSON.stringify({ word: form.word, category: form.category, difficulty: form.difficulty || 'beginner' }) });
        setForm({ ...emptyWord, ...d.draft }); notify('AI vocabulary draft is ready. Review it before saving.');
      } else {
        const d = await requestJson('/api/admin/topics/generate', { method: 'POST', headers, body: JSON.stringify({ title: form.title, category: form.category, difficulty: form.difficulty || 'beginner' }) });
        const draft = { ...d.draft };
        for (const field of ['vocabulary', 'sentences', 'exercises', 'questions']) draft[field] = JSON.stringify(draft[field] || [], null, 2);
        setForm({ ...emptyTopic, ...draft, status: 'ai-generated' }); notify('AI lesson draft is ready. Review and edit before saving.');
      }
    } catch (e:any) { setError(e.message || 'AI generation failed. Confirm OPENROUTER_API_KEY is configured on the backend.'); }
    finally { setAiGenerating(false); }
  };
  const importItems = async (e: React.FormEvent) => {
    e.preventDefault(); setImporting(true); setError('');
    try {
      const parsed = JSON.parse(importText);
      if (!Array.isArray(parsed) || parsed.length < 1 || parsed.length > 250) throw new Error('Paste a JSON array containing 1–250 items.');
      for (const [index, item] of parsed.entries()) {
        try { await requestJson(endpoint, { method: 'POST', headers, body: JSON.stringify(item) }); }
        catch (error: any) { throw new Error(`Imported ${index} of ${parsed.length} items. Item ${index + 1}: ${error.message}`); }
      }
      setImportText(''); setShowImport(false); notify(`${parsed.length} items imported as provided.`); await load();
    } catch (error: any) { setError(error.message || 'Import failed.'); }
    finally { setImporting(false); }
  };
  const exportItems = () => {
    const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `speakora-${section}-${new Date().toISOString().slice(0,10)}.json`; anchor.click(); URL.revokeObjectURL(url);
  };

  const tabs = [['lessons','Lessons'],['vocabulary','Vocabulary'],['speaking','Speaking prompts'],['media','Media upload']] as const;
  const visibleItems = items.filter(item => {
    const label = String(item.title || item.word || item.topic || '').toLowerCase();
    const detail = `${item.category || ''} ${item.description || ''} ${item.question || ''}`.toLowerCase();
    return (!filter || `${label} ${detail}`.includes(filter.toLowerCase())) && (statusFilter === 'all' || (item.status || 'draft') === statusFilter);
  });
  const publishedCount = items.filter(item => item.status === 'published').length;
  return <section className="admin-dashboard"><div className="section-heading"><div><div className="section-kicker"><ShieldCheck size={13}/> ADMIN WORKSPACE</div><h2>Manage Speakora content</h2><p>Build, review, publish, and maintain the content learners use.</p></div><div className="admin-header-actions"><button className="secondary-btn" onClick={onOpenGate}>GATE question bank <ArrowRight size={14}/></button><button className="secondary-btn" onClick={()=>void load()} disabled={loading}><RefreshCw size={14}/> Refresh</button></div></div>
    <div className="admin-metrics"><div><b>{items.length}</b><span>Total {section==='lessons'?'lessons':section==='vocabulary'?'words':section==='speaking'?'prompts':'items'}</span></div><div><b>{publishedCount}</b><span>Published</span></div><div><b>{items.length-publishedCount}</b><span>Draft or archived</span></div><div><b>{section==='media'?'Cloudinary':'MongoDB'}</b><span>Content storage</span></div></div>
    <div className="admin-tabs">{tabs.map(([key,label])=><button key={key} className={`secondary-btn ${section===key?'active':''}`} onClick={()=>setSection(key)}>{label}</button>)}</div>
    {section!=='media'&&<div className="admin-tools"><label className="admin-search"><Search size={15}/><input value={filter} onChange={e=>setFilter(e.target.value)} placeholder={`Search ${section}…`}/></label><select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} aria-label="Filter content by status"><option value="all">All statuses</option><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option><option value="pending-review">Pending review</option></select><button className="secondary-btn" onClick={()=>setShowImport(x=>!x)}><Upload size={14}/> Import JSON</button><button className="secondary-btn" onClick={exportItems} disabled={!items.length}><Download size={14}/> Export</button></div>}
    {error&&<div className="auth-error admin-error">{error}</div>}
    {showImport&&section!=='media'&&<form className="admin-import" onSubmit={importItems}><div><b>Bulk import {section}</b><span>Paste an array of objects. Maximum 250 records per import. Import uses the selected content type.</span></div><textarea required rows={6} value={importText} onChange={e=>setImportText(e.target.value)} placeholder={'[{"title":"Daily conversations","category":"Daily life","difficulty":"beginner","description":"...","status":"draft"}]'}/><div className="admin-import-actions"><button className="generate-btn" disabled={importing}>{importing?'Importing…':'Validate & import'}</button><button type="button" className="secondary-btn" onClick={()=>setShowImport(false)}>Close</button></div></form>}
    {section==='media'?<div className="admin-content-grid media-admin-grid"><form className="question-form admin-form" onSubmit={upload}><h3 className="wide-field">{editing?'Edit media item':'Upload learning media'}</h3><label>Title<input required minLength={2} maxLength={120} value={form.title||''} onChange={e=>setForm({...form,title:e.target.value})}/></label><label>Category<select value={form.category||'Daily life'} onChange={e=>setForm({...form,category:e.target.value})}>{['Daily life','Professional','Interview prep','Engineering','GATE Practice','Other'].map(x=><option key={x}>{x}</option>)}</select></label><label className="wide-field">Description<textarea rows={3} maxLength={2000} value={form.description||''} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Tell learners what this image, video or document covers."/></label><label>Status<select value={form.status||'published'} onChange={e=>setForm({...form,status:e.target.value})}><option value="published">Published — show to learners</option><option value="draft">Draft — admin only</option><option value="archived">Archived</option></select></label>{!editing&&<label className="wide-field">Media file<input required type="file" accept="image/jpeg,image/png,image/webp,application/pdf,video/mp4" onChange={e=>setFile(e.target.files?.[0]||null)}/></label>}<p className="wide-field admin-note-text">Maximum 20 MB. Cloudinary stores the file; MongoDB stores the learner-visible title, category and publish status.</p><button className="generate-btn" disabled={loading||(!editing&&!file)}>{loading?editing?'Saving…':'Uploading…':editing?'Save changes':<><FileUp size={15}/> Upload & publish</>}</button>{editing&&<button className="secondary-btn" type="button" onClick={()=>{setEditing('');setForm(emptyMedia)}}><X size={14}/> Cancel edit</button>}{asset&&<a className="wide-field" href={asset} target="_blank" rel="noreferrer">Open uploaded media <ArrowRight size={14}/></a>}</form><div className="admin-items"><div className="draft-header"><h3>Uploaded media</h3><div className="media-list-actions"><span>{items.length} items</span><button className="secondary-btn" onClick={()=>void syncMedia()} disabled={syncingMedia}><RefreshCw size={13} className={syncingMedia?'spin':''}/>{syncingMedia?'Syncing…':'Sync existing'}</button></div></div>{loading&&!items.length?<p>Loading…</p>:items.length?items.map(item=><article className="admin-item media-admin-item" key={item._id}><div><b>{item.title}</b><small><span className={`admin-status ${item.status||'draft'}`}>{item.status||'draft'}</span> · {item.category} · {item.format?.toUpperCase()||item.resourceType}</small><a href={item.url} target="_blank" rel="noreferrer">Preview file <ArrowRight size={12}/></a></div><button className="publish-btn" onClick={()=>{setEditing(item._id||'');setForm({...emptyMedia,...item});window.scrollTo({top:0,behavior:'smooth'})}} aria-label="Edit media"><Pencil size={14}/></button><button className="delete-btn" onClick={()=>void remove(item._id)} aria-label="Remove media record"><Trash2 size={14}/></button></article>):<p>No media uploaded yet. Use “Sync existing” to import earlier Cloudinary uploads.</p>}</div></div>:<div className="admin-content-grid"><form className="question-form admin-form" onSubmit={save}><h3 className="wide-field">{editing?'Edit item':`Add ${section==='lessons'?'lesson':section==='vocabulary'?'word':'speaking prompt'}`}</h3>
      {(section==='lessons'||section==='vocabulary')&&<div className="wide-field ai-assist-row"><button type="button" className="secondary-btn" disabled={aiGenerating||!(section==='lessons'?form.title:form.word)||!form.category} onClick={()=>void generateWithAI()}>{aiGenerating?<LoaderCircle size={14} className="spin"/>:<Sparkles size={14}/>} {aiGenerating?'Generating…':section==='lessons'?'Generate lesson with AI':'Generate word details with AI'}</button><span>AI output is an editable draft. Check accuracy before publishing.</span></div>}
      {section==='lessons'&&<><label>Title<input required maxLength={120} value={form.title||''} onChange={e=>setForm({...form,title:e.target.value})}/></label><label>Category<select required value={categoryChoices.includes(form.category)?form.category:'Other / custom'} onChange={e=>setCategory(e.target.value)}>{categoryChoices.map(category=><option key={category}>{category}</option>)}</select>{(!categoryChoices.includes(form.category)||form.category==='Other / custom')&&<input required maxLength={80} aria-label="Custom category" placeholder="Type a category" value={form.category==='Other / custom'?'':form.category||''} onChange={e=>setForm({...form,category:e.target.value})}/>}</label><label>Difficulty<select value={form.difficulty||'beginner'} onChange={e=>setForm({...form,difficulty:e.target.value})}><option>beginner</option><option>intermediate</option><option>advanced</option></select></label><label>Status<select value={form.status||'draft'} onChange={e=>setForm({...form,status:e.target.value})}><option>draft</option><option>ai-generated</option><option>pending-review</option><option>published</option><option>archived</option></select></label><label className="wide-field">Description<textarea required maxLength={10000} rows={4} value={form.description||''} onChange={e=>setForm({...form,description:e.target.value})}/></label><label className="wide-field">Visual explanation<textarea rows={3} value={form.visualExplanation||''} onChange={e=>setForm({...form,visualExplanation:e.target.value})}/></label><label className="wide-field">Voice script<textarea rows={3} value={form.voiceScript||''} onChange={e=>setForm({...form,voiceScript:e.target.value})}/></label>{(['vocabulary','sentences','exercises','questions'] as const).map(field=><label className="wide-field" key={field}>{field[0].toUpperCase()+field.slice(1)} (JSON array)<textarea className="json-editor" rows={3} spellCheck={false} value={String(form[field]??'[]')} onChange={e=>setForm({...form,[field]:e.target.value})}/></label>)}</>}
      {section==='vocabulary'&&<><label>Word<input required maxLength={100} value={form.word||''} onChange={e=>setForm({...form,word:e.target.value})}/></label><label>Category<select required value={categoryChoices.includes(form.category)?form.category:'Other / custom'} onChange={e=>setCategory(e.target.value)}>{categoryChoices.map(category=><option key={category}>{category}</option>)}</select>{(!categoryChoices.includes(form.category)||form.category==='Other / custom')&&<input required maxLength={80} aria-label="Custom category" placeholder="Type a category" value={form.category==='Other / custom'?'':form.category||''} onChange={e=>setForm({...form,category:e.target.value})}/>}</label><label>Hindi meaning<input maxLength={250} value={form.meaningHindi||''} onChange={e=>setForm({...form,meaningHindi:e.target.value})}/></label><label>Part of speech<input maxLength={30} value={form.partOfSpeech||''} onChange={e=>setForm({...form,partOfSpeech:e.target.value})}/></label><label>Pronunciation<input maxLength={100} value={form.pronunciation||''} onChange={e=>setForm({...form,pronunciation:e.target.value})}/></label><label>Difficulty<select value={form.difficulty||'beginner'} onChange={e=>setForm({...form,difficulty:e.target.value})}><option>beginner</option><option>intermediate</option><option>advanced</option></select></label><label className="wide-field">Definition<textarea rows={3} value={form.definition||''} onChange={e=>setForm({...form,definition:e.target.value})}/></label><label className="wide-field">Example<textarea rows={2} maxLength={1000} value={form.example||''} onChange={e=>setForm({...form,example:e.target.value})}/></label><label className="wide-field">Hindi translation<input maxLength={1000} value={form.translationHindi||''} onChange={e=>setForm({...form,translationHindi:e.target.value})}/></label><label>Where to use<textarea rows={2} value={form.whereToUse||''} onChange={e=>setForm({...form,whereToUse:e.target.value})}/></label><label>Where not to use<textarea rows={2} value={form.whereNotToUse||''} onChange={e=>setForm({...form,whereNotToUse:e.target.value})}/></label><label>Status<select value={form.status||'draft'} onChange={e=>setForm({...form,status:e.target.value})}><option>draft</option><option>published</option><option>archived</option></select></label></>}
      {section==='speaking'&&<><label>Topic<input required maxLength={100} value={form.topic||''} onChange={e=>setForm({...form,topic:e.target.value})}/></label><label>Category<input required maxLength={80} value={form.category||''} onChange={e=>setForm({...form,category:e.target.value})}/></label><label className="wide-field">Practice question<textarea required rows={3} value={form.question||''} onChange={e=>setForm({...form,question:e.target.value})}/></label><label className="wide-field">Sample answer<textarea required rows={4} value={form.sample||''} onChange={e=>setForm({...form,sample:e.target.value})}/></label><label className="wide-field">Learner tip<textarea required rows={2} value={form.tip||''} onChange={e=>setForm({...form,tip:e.target.value})}/></label><label>Status<select value={form.status||'draft'} onChange={e=>setForm({...form,status:e.target.value})}><option>draft</option><option>published</option><option>archived</option></select></label></>}
      <button className="generate-btn" disabled={loading}>{loading?'Saving…':editing?'Save changes':form.status==='published'?'Publish content':<><Plus size={15}/> Save draft</>}</button>{editing&&<button type="button" className="secondary-btn" onClick={()=>{setForm(emptyForm());setEditing('')}}><X size={14}/> Cancel edit</button>}</form>
      <div className="admin-items"><div className="draft-header"><h3>{section==='lessons'?'Lessons':section==='vocabulary'?'Vocabulary':'Speaking prompts'}</h3><span>{visibleItems.length} of {items.length} items</span></div>{loading&&!items.length?<p>Loading…</p>:visibleItems.length?visibleItems.map(item=><article className="admin-item" key={item._id}><div><b>{item.title||item.word||item.topic}</b><small><span className={`admin-status ${item.status||'draft'}`}>{item.status||'draft'}</span> · {item.category}{item.question?` · ${item.question}`:''}</small></div><button className="publish-btn" onClick={()=>edit(item)} aria-label={`Edit ${item.title||item.word||item.topic}`}><Pencil size={14}/></button><button className="delete-btn" onClick={()=>void remove(item._id)} aria-label={`Delete ${item.title||item.word||item.topic}`}><Trash2 size={14}/></button></article>):<p>{items.length?'No content matches these filters.':'No items yet. Add the first one.'}</p>}</div></div>}
  </section>;
}

