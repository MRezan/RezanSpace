'use client';

import Link from 'next/link';
import { ChangeEvent, FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { posts as allStories } from '../posts';
import { categories } from '../categories';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
type View = 'home' | 'edit' | 'write' | 'library';
type User = { id:number; name:string; email:string; bio:string; website:string; avatar_url:string; profession:string; address:string; interests:string; role:string; created_at:string };
type UserPost = { id:number; title:string; excerpt:string; status:string; created_at:string };

export default function Profile() {
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<UserPost[]>([]);
  const [saved, setSaved] = useState<string[]>([]);
  const [view, setView] = useState<View>('home');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const load = useCallback(async () => {
    const token = localStorage.getItem('rezantech_session');
    if (!token) { router.replace('/account'); return; }
    const headers = { Authorization: `Bearer ${token}` };
    const [profileResponse, libraryResponse] = await Promise.all([
      fetch(`${API}/api/profile.php`, { headers }),
      fetch(`${API}/api/library.php`, { headers }),
    ]);
    if (profileResponse.status === 401) {
      localStorage.removeItem('rezantech_session');
      router.replace('/account');
      return;
    }
    const profile = await profileResponse.json();
    const library = libraryResponse.ok ? await libraryResponse.json() : { saved: [] };
    setUser(profile.user);
    setPosts(profile.posts || []);
    setSaved((library.saved || []).map((item: { post_slug:string }) => item.post_slug));
    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  async function update(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = localStorage.getItem('rezantech_session');
    const formData = new FormData(event.currentTarget);
    const response = await fetch(`${API}/api/profile.php`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(formData)),
    });
    if (response.ok) {
      const cached = JSON.parse(localStorage.getItem('rezantech_user') || '{}');
      localStorage.setItem('rezantech_user', JSON.stringify({ ...cached, name:formData.get('name') }));
      window.dispatchEvent(new CustomEvent('rezantech:profile-updated'));
      setNotice('Your profile was updated.');
      setView('home');
      load();
    }
  }

  async function setAvatar(file:File|null) {
    const token=localStorage.getItem('rezantech_session');if(!token)return false;
    let avatar_url='';
    if(file){const upload=new FormData();upload.append('image',file);const uploadResponse=await fetch(`${API}/api/upload.php`,{method:'POST',headers:{Authorization:`Bearer ${token}`},body:upload});const uploaded=await uploadResponse.json();if(!uploadResponse.ok){setNotice(uploaded.error||'Could not upload your profile picture.');return false}avatar_url=uploaded.url}
    const response=await fetch(`${API}/api/profile.php`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({avatar_url})});
    if(!response.ok){const data=await response.json();setNotice(data.error||'Could not update your profile picture.');return false}
    const cached=JSON.parse(localStorage.getItem('rezantech_user')||'{}');localStorage.setItem('rezantech_user',JSON.stringify({...cached,avatar_url}));window.dispatchEvent(new CustomEvent('rezantech:profile-updated'));setUser(current=>current?{...current,avatar_url}:current);setNotice(file?'Profile picture updated.':'Profile picture removed.');return true;
  }

  async function write(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = localStorage.getItem('rezantech_session');
    const form = event.currentTarget;
    const response = await fetch(`${API}/api/user-posts.php`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(new FormData(form))),
    });
    const data = await response.json();
    if (response.ok) {
      form.reset();
      setNotice(data.message);
      setView('home');
      load();
    } else setNotice(data.error);
  }

  if (loading) return <main className="profile-loading"><i/><p>Preparing your profile…</p></main>;
  if (!user) return null;

  const savedStories = allStories.filter(post => saved.includes(post.slug));
  const published = posts.filter(post => post.status === 'published').length;
  const pending = posts.filter(post => post.status !== 'published').length;

  return <main className="profile-page profile-v2">
    <div className="profile-content">
      {notice && <div className="cms-notice">{notice}<button onClick={() => setNotice('')}>×</button></div>}

      <section className="profile-cover">
        <div className="cover-pattern"><i/><i/><i/></div>
        <div className="profile-identity">
          <span className="profile-photo">{user.avatar_url?<img src={user.avatar_url} alt={`${user.name} profile picture`}/>:user.name[0].toUpperCase()}</span>
          <div>
            <small>REZANTECH COMMUNITY</small>
            <h1>{user.name}</h1>
            <p>{user.profession ? `${user.profession}${user.address ? ` · ${user.address}` : ''}` : user.bio || 'Reader, independent thinker and community contributor.'}</p>
          </div>
          <button onClick={() => setView('edit')}>✎ Edit profile</button>
        </div>
      </section>

      <nav className="profile-tabs" aria-label="Profile sections">
        <button className={view === 'home' ? 'active' : ''} onClick={() => setView('home')}>Overview</button>
        <button className={view === 'library' ? 'active' : ''} onClick={() => setView('library')}>Reading list <span>{savedStories.length}</span></button>
        <button className={view === 'write' ? 'active' : ''} onClick={() => setView('write')}>Submit a story</button>
        <button className={view === 'edit' ? 'active' : ''} onClick={() => setView('edit')}>About</button>
      </nav>

      {view === 'home' && <div className="profile-grid">
        <section className="profile-main-column">
          <div className="profile-section-heading">
            <div><small>YOUR PUBLISHING</small><h2>Stories and submissions</h2></div>
            <button onClick={() => setView('write')}>＋ New story</button>
          </div>
          <div className="profile-story-list">
            {posts.length ? posts.map(post => <article key={post.id}>
              <span className="story-letter">{post.title[0]}</span>
              <div><h3>{post.title}</h3><p>{post.excerpt}</p><small>{new Date(post.created_at).toLocaleDateString()}</small></div>
              <b className={`status ${post.status}`}>{post.status}</b>
            </article>) : <div className="profile-empty">
              <span>✦</span><h3>Your byline starts here.</h3>
              <p>Share an original story, useful experience or informed perspective with the community.</p>
              <button onClick={() => setView('write')}>Write your first story</button>
            </div>}
          </div>
        </section>
        <aside className="profile-rail">
          <section className="profile-about"><h3>About</h3><p>{user.bio || 'Reader and independent community contributor.'}</p>{user.profession&&<div><b>Profession</b><span>{user.profession}</span></div>}{user.address&&<div><b>Location</b><span>{user.address}</span></div>}{user.interests&&<div><b>Interests</b><span className="interest-tags">{user.interests.split(',').filter(Boolean).map(interest=><i key={interest}>{interest.trim()}</i>)}</span></div>}{user.website && <a href={user.website} target="_blank" rel="noreferrer">↗ {user.website}</a>}<small>Joined {new Date(user.created_at).toLocaleDateString(undefined, { month:'long', year:'numeric' })}</small></section>
          <section className="profile-stats"><div><b>{posts.length}</b><span>Stories</span></div><div><b>{published}</b><span>Published</span></div><div><b>{pending}</b><span>In review</span></div></section>
          <section className="profile-tip"><span>💡</span><div><b>Build your network</b><p>Keep your profession and interests current so relevant readers can discover you.</p></div></section>
        </aside>
      </div>}

      {view === 'library' && <section className="profile-library">
        <div className="profile-section-heading"><div><small>YOUR LIBRARY</small><h2>Saved for later</h2></div><span>{savedStories.length} stories</span></div>
        {savedStories.length ? savedStories.map(post => <article key={post.slug}>
          <div><small>{post.category}</small><Link href={`/article/${post.slug}`}><h3>{post.title}</h3></Link><p>{post.excerpt}</p><span>{post.author} · {post.readTime}</span></div>
          <Link href={`/article/${post.slug}`}>Read →</Link>
        </article>) : <div className="profile-empty"><span><i className="bookmark-icon"/></span><h3>Your reading list is empty.</h3><p>Save stories from the feed and they will appear here.</p><Link href="/">Explore stories</Link></div>}
      </section>}

      {view === 'edit' && <ProfileForm user={user} submit={update} setAvatar={setAvatar} />}
      {view === 'write' && <Writer submit={write} />}
    </div>
  </main>;
}

function ProfileForm({ user, submit, setAvatar }: { user:User; submit:(event:FormEvent<HTMLFormElement>)=>void;setAvatar:(file:File|null)=>Promise<boolean> }) {
  return <form className="profile-form" onSubmit={submit}>
    <span className="kicker">PUBLIC PROFILE</span><h1>Edit your profile</h1>
    <p>This information appears beside your published stories.</p>
    <AvatarEditor user={user} setAvatar={setAvatar}/>
    <label>Display name<input name="name" defaultValue={user.name} required /></label>
    <div className="profile-form-row"><label>Profession<input name="profession" defaultValue={user.profession} maxLength={120} placeholder="e.g. Product Designer" /></label><label>Location or address<input name="address" defaultValue={user.address} maxLength={255} placeholder="City, region or address" /></label></div>
    <label>Interests<input name="interests" defaultValue={user.interests} maxLength={500} placeholder="Technology, business, culture, health…" /><small>Separate interests with commas.</small></label>
    <label>Short biography<textarea name="bio" rows={5} defaultValue={user.bio} placeholder="What do you build, study or care about?" /></label>
    <label>Website<input name="website" type="url" defaultValue={user.website} placeholder="https://" /></label>
    <button>Save changes</button>
  </form>;
}

function AvatarEditor({user,setAvatar}:{user:User;setAvatar:(file:File|null)=>Promise<boolean>}){
  const [source,setSource]=useState(''),[file,setFile]=useState<File|null>(null),[zoom,setZoom]=useState(1),[busy,setBusy]=useState(false);const input=useRef<HTMLInputElement>(null);
  function choose(event:ChangeEvent<HTMLInputElement>){const selected=event.target.files?.[0];if(!selected)return;if(selected.size>5*1024*1024){alert('Choose an image smaller than 5 MB.');event.target.value='';return}setFile(selected);setSource(URL.createObjectURL(selected));setZoom(1)}
  function cancel(){if(source)URL.revokeObjectURL(source);setSource('');setFile(null);setZoom(1);if(input.current)input.current.value=''}
  async function confirm(){if(!file)return;setBusy(true);try{const bitmap=await createImageBitmap(file);const side=Math.min(bitmap.width,bitmap.height)/zoom;const sx=(bitmap.width-side)/2,sy=(bitmap.height-side)/2;const canvas=document.createElement('canvas');canvas.width=512;canvas.height=512;canvas.getContext('2d')?.drawImage(bitmap,sx,sy,side,side,0,0,512,512);bitmap.close();const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/jpeg',.9));if(!blob)throw new Error('Could not process image.');const success=await setAvatar(new File([blob],`profile-${Date.now()}.jpg`,{type:'image/jpeg'}));if(success)cancel()}catch(error){alert(error instanceof Error?error.message:'Could not process image.')}finally{setBusy(false)}}
  return <div className="avatar-editor"><span>{source?<img src={source} alt="Selected profile picture"/>:user.avatar_url?<img src={user.avatar_url} alt="Current profile picture"/>:user.name[0].toUpperCase()}</span><div><b>Profile picture</b><p>Select an image, adjust the crop, then confirm before it is uploaded.</p><label>Choose picture<input ref={input} type="file" accept="image/jpeg,image/png,image/webp" onChange={choose}/></label>{user.avatar_url&&!source&&<button type="button" onClick={()=>setAvatar(null)}>Remove picture</button>}</div>{source&&<div className="avatar-crop"><div className="crop-preview"><img src={source} alt="Crop preview" style={{transform:`scale(${zoom})`}}/></div><label>Crop and zoom<input type="range" min="1" max="2.5" step=".05" value={zoom} onChange={event=>setZoom(Number(event.target.value))}/></label><footer><button type="button" onClick={cancel}>Cancel</button><button type="button" disabled={busy} onClick={confirm}>{busy?'Uploading…':'Set profile picture'}</button></footer></div>}</div>
}

function Writer({ submit }: { submit:(event:FormEvent<HTMLFormElement>)=>void }) {
  return <form className="writer-form" onSubmit={submit}>
    <div><span className="kicker">COMMUNITY DESK</span><h1>Submit a story.</h1><p>Original, useful writing across the subjects you know and care about. Every submission is reviewed before publication.</p></div>
    <label>Headline<input name="title" required placeholder="A specific, compelling headline" /></label>
    <div className="writer-two"><label>Category<select name="category">{categories.map(category=><option key={category}>{category}</option>)}</select></label><label>Suggested URL<input name="slug" placeholder="your-story-slug" /></label></div>
    <label>Summary<textarea name="excerpt" required rows={3} placeholder="Explain the central idea in one or two sentences." /></label>
    <label>Story<textarea name="content" required rows={16} placeholder="Write your complete article…" /></label>
    <aside><p><b>Before you submit</b><br/>Confirm the work is original, factual and yours to publish.</p><button>Submit for review</button></aside>
  </form>;
}
