import { useEffect, useMemo, useState } from 'react'
import { Link, NavLink, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import { Activity, Bookmark, Check, ChevronRight, Clapperboard, Compass, Film, Heart, List, LogIn, Menu, Plus, Search, Settings, Star, UserRound, X } from 'lucide-react'
import { getMovie, getPopular, getTrending, imageUrl, searchMovies, type Movie } from './lib/tmdb'
import { hasSupabase, supabase, type Profile } from './lib/supabase'

type Review = { id: string; movie_id: number; movie_title: string; poster_path: string | null; rating: number; body: string; created_at: string; username: string }
const demoMovies: Movie[] = [
 {id: 872585,title:'Oppenheimer',overview:'The story of J. Robert Oppenheimer and his role in the development of the atomic bomb.',poster_path:null,backdrop_path:null,release_date:'2023-07-19',vote_average:8.1},
 {id: 693134,title:'Dune: Part Two',overview:'Paul Atreides unites with Chani and the Fremen while seeking revenge.',poster_path:null,backdrop_path:null,release_date:'2024-02-27',vote_average:8.5},
 {id: 346698,title:'Barbie',overview:'Barbie and Ken are having the time of their lives in the colorful world of Barbie Land.',poster_path:null,backdrop_path:null,release_date:'2023-07-19',vote_average:7.0},
 {id: 569094,title:'Spider-Man: Across the Spider-Verse',overview:'Miles Morales catapults across the Multiverse.',poster_path:null,backdrop_path:null,release_date:'2023-05-31',vote_average:8.4},
 {id: 496243,title:'Parasite',overview:'Greed and class discrimination threaten a newly formed symbiotic relationship.',poster_path:null,backdrop_path:null,release_date:'2019-05-30',vote_average:8.5},
 {id: 424,title:'Schindler’s List',overview:'The story of a businessman who saved the lives of more than a thousand refugees.',poster_path:null,backdrop_path:null,release_date:'1993-11-30',vote_average:8.6},
]
const sampleReviews: Review[] = [
 {id:'r1',movie_id:496243,movie_title:'Parasite',poster_path:null,rating:5,body:'Every frame has a purpose. A masterclass in tension, visual storytelling and social commentary.',created_at:'2026-11-14',username:'framebyframe'},
 {id:'r2',movie_id:872585,movie_title:'Oppenheimer',poster_path:null,rating:4.5,body:'A monumental sound-and-image experience. The editing never lets you breathe.',created_at:'2026-11-13',username:'cinemaniac'},
 {id:'r3',movie_id:346698,movie_title:'Barbie',poster_path:null,rating:4,body:'Bright, funny, and much more thoughtful than it first lets on.',created_at:'2026-11-12',username:'reelthoughts'},
]
function App() {
 const [user,setUser] = useState<Profile | null>(null)
 const [email,setEmail] = useState('')
 const [password,setPassword] = useState('')
 const [authOpen,setAuthOpen] = useState(false)
 const [authMode,setAuthMode] = useState<'login'|'signup'>('login')
 const [authMessage,setAuthMessage] = useState('')
 const [watchlist,setWatchlist] = useState<number[]>([])
 const [diary,setDiary] = useState<number[]>([])
 const [reviews,setReviews] = useState<Review[]>(sampleReviews)
 const [search,setSearch] = useState('')
 const [searchResults,setSearchResults] = useState<Movie[]>([])
 const [searching,setSearching] = useState(false)
 const [mobileMenu,setMobileMenu] = useState(false)
 const [toast,setToast] = useState('')
 const navigate = useNavigate()

 useEffect(() => {
  if (!supabase) return
  supabase.auth.getSession().then(({data}) => { if (data.session) loadProfile(data.session.user.id) })
  const {data:{subscription}} = supabase.auth.onAuthStateChange((_event,session) => {
   if (session) loadProfile(session.user.id); else setUser(null)
  })
  return () => subscription.unsubscribe()
 }, [])
 async function loadProfile(id:string) {
  const {data} = await supabase!.from('profiles').select('*').eq('id',id).single()
  if (data) setUser(data)
 }
 async function authenticate() {
  setAuthMessage('')
  if (!supabase) { setAuthMessage('Connect Supabase first. See SETUP.md.'); return }
  const result = authMode === 'signup'
   ? await supabase.auth.signUp({email,password})
   : await supabase.auth.signInWithPassword({email,password})
  if (result.error) setAuthMessage(result.error.message)
  else if (authMode === 'signup') setAuthMessage('Check your email to confirm your account.')
  else { setAuthOpen(false); setAuthMessage('') }
 }
 async function signOut() { await supabase?.auth.signOut(); setUser(null) }
 function notify(message:string) { setToast(message); window.setTimeout(()=>setToast(''),2600) }
 async function toggleWatch(movie:Movie) {
  if (!user) { setAuthOpen(true); return }
  if (hasSupabase) {
   const exists = watchlist.includes(movie.id)
   if (exists) await supabase!.from('watchlist').delete().eq('user_id',user.id).eq('movie_id',movie.id)
   else await supabase!.from('watchlist').insert({user_id:user.id,movie_id:movie.id,movie_title:movie.title,poster_path:movie.poster_path})
  }
  setWatchlist(old => old.includes(movie.id) ? old.filter(x=>x!==movie.id) : [...old,movie.id])
  notify(watchlist.includes(movie.id) ? 'Removed from watchlist' : 'Added to watchlist')
 }
 async function logMovie(movie:Movie,rating:number,body:string) {
  if (!user) { setAuthOpen(true); return }
  const item:Review = {id:crypto.randomUUID(),movie_id:movie.id,movie_title:movie.title,poster_path:movie.poster_path,rating,body,created_at:new Date().toISOString(),username:user.username}
  if (hasSupabase) {
   const {error} = await supabase!.from('reviews').upsert({id:item.id,user_id:user.id,movie_id:movie.id,movie_title:movie.title,poster_path:movie.poster_path,rating,body},{onConflict:'user_id,movie_id'})
   if (error) { notify(error.message); return }
  }
  setReviews(old=>[item,...old.filter(r=>r.movie_id!==movie.id)])
  setDiary(old=>old.includes(movie.id)?old:[...old,movie.id])
  notify('Your film has been logged')
 }
 useEffect(() => {
  if (search.trim().length < 2) { setSearchResults([]); return }
  const timer = window.setTimeout(async()=>{
   setSearching(true)
   try { const data = await searchMovies(search); setSearchResults(data.results.slice(0,7)) }
   catch { setSearchResults(demoMovies.filter(m=>m.title.toLowerCase().includes(search.toLowerCase()))) }
   finally { setSearching(false) }
  },350)
  return ()=>window.clearTimeout(timer)
 },[search])

 const ctx = {user,watchlist,diary,reviews,toggleWatch,logMovie,notify,openAuth:()=>setAuthOpen(true)}
 return <div className="app-shell">
  <header className="topbar">
   <Link to="/" className="brand"><span className="brand-mark"><Clapperboard size={19}/></span><span>CINE<span className="brand-accent">LOG</span></span></Link>
   <nav className={`main-nav ${mobileMenu?'nav-open':''}`}>
    <NavLink to="/" end onClick={()=>setMobileMenu(false)}>Home</NavLink>
    <NavLink to="/films" onClick={()=>setMobileMenu(false)}>Films</NavLink>
    <NavLink to="/diary" onClick={()=>setMobileMenu(false)}>Diary</NavLink>
    <NavLink to="/watchlist" onClick={()=>setMobileMenu(false)}>Watchlist</NavLink>
    <NavLink to="/community" onClick={()=>setMobileMenu(false)}>Community</NavLink>
   </nav>
   <div className="header-actions">
    <div className="search-wrap"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Find a film..." aria-label="Search films"/>
     {search && <button className="icon-button clear-search" onClick={()=>setSearch('')}><X size={15}/></button>}
     {searchResults.length>0 && <div className="search-popover">{searchResults.map(m=><button key={m.id} onClick={()=>{navigate(`/film/${m.id}`);setSearch('')}}><img src={imageUrl(m.poster_path,'w92')} /><span>{m.title}<small>{m.release_date?.slice(0,4)}</small></span></button>)}</div>}
     {searching && <div className="search-popover search-hint">Searching films…</div>}
    </div>
    {user ? <button className="avatar" onClick={()=>navigate('/profile')}>{(user.display_name||user.username).slice(0,1).toUpperCase()}</button> : <button className="button button-small" onClick={()=>setAuthOpen(true)}>Sign in</button>}
    <button className="icon-button mobile-toggle" onClick={()=>setMobileMenu(!mobileMenu)}><Menu/></button>
   </div>
  </header>
  <main className="page-wrap"><Routes>
   <Route path="/" element={<Home ctx={ctx}/>}/>
   <Route path="/films" element={<Films ctx={ctx}/>}/>
   <Route path="/film/:id" element={<FilmDetail ctx={ctx}/>}/>
   <Route path="/diary" element={<Collection title="Your diary" subtitle="Every film leaves a trace." ids={diary} ctx={ctx} empty="Your watched films will appear here once you start logging."/>}/>
   <Route path="/watchlist" element={<Collection title="Watchlist" subtitle="All the films you can’t wait to see." ids={watchlist} ctx={ctx} empty="Your watchlist is waiting for its first film."/>}/>
   <Route path="/community" element={<Community reviews={reviews}/>}/>
   <Route path="/profile" element={<ProfilePage ctx={ctx} signOut={signOut}/>}/>
   <Route path="*" element={<Home ctx={ctx}/>}/>
  </Routes></main>
  <footer className="footer"><div className="brand"><span className="brand-mark"><Clapperboard size={16}/></span>CINE<span className="brand-accent">LOG</span></div><span>A little space for the films that stay with you.</span><span>Movie data powered by TMDB</span></footer>
  {authOpen && <div className="modal-backdrop" onClick={()=>setAuthOpen(false)}><div className="modal auth-modal" onClick={e=>e.stopPropagation()}><button className="modal-close icon-button" onClick={()=>setAuthOpen(false)}><X/></button><div className="eyebrow">WELCOME TO CINELOG</div><h2>{authMode==='login'?'Good to see you again.':'Start your film diary.'}</h2><p className="muted">Keep track of what you watch and share what you think.</p><form onSubmit={e=>{e.preventDefault();authenticate()}}><label>Email address<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="you@example.com"/></label><label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} minLength={6} required placeholder="At least 6 characters"/></label><button className="button full-button">{authMode==='login'?'Sign in':'Create account'}</button></form>{authMessage&&<p className="form-message">{authMessage}</p>}<p className="switch-auth">{authMode==='login'?"New to CineLog?":"Already have an account?"} <button onClick={()=>{setAuthMode(authMode==='login'?'signup':'login');setAuthMessage('')}}>{authMode==='login'?'Create an account':'Sign in'}</button></p></div></div>}
  {toast&&<div className="toast"><Check size={16}/>{toast}</div>}
 </div>
}
type Ctx = {user:Profile|null;watchlist:number[];diary:number[];reviews:Review[];toggleWatch:(m:Movie)=>void;logMovie:(m:Movie,r:number,b:string)=>void;notify:(s:string)=>void;openAuth:()=>void}
function Home({ctx}:{ctx:Ctx}) {
 const [trending,setTrending]=useState<Movie[]>(demoMovies)
 const [popular,setPopular]=useState<Movie[]>(demoMovies.slice().reverse())
 const [loading,setLoading]=useState(false)
 useEffect(()=>{setLoading(true);Promise.all([getTrending(),getPopular()]).then(([a,b])=>{setTrending(a.results.slice(0,8));setPopular(b.results.slice(0,6))}).catch(()=>{}).finally(()=>setLoading(false))},[])
 return <><section className="hero"><div className="hero-copy"><div className="eyebrow"><span className="live-dot"/> YOUR PERSONAL FILM UNIVERSE</div><h1>Every film.<br/><em>Every feeling.</em></h1><p>A home for your movie memories. Keep a diary, discover your next favourite, and find people who love cinema as much as you do.</p><div className="hero-actions"><Link className="button" to="/films">Explore films <ChevronRight size={17}/></Link><Link className="text-link" to="/diary">Open your diary <ChevronRight size={15}/></Link></div><div className="hero-stats"><div><strong>01</strong><span>LOG WHAT YOU WATCH</span></div><div><strong>02</strong><span>RATE & REVIEW</span></div><div><strong>03</strong><span>FIND YOUR PEOPLE</span></div></div></div><div className="hero-art"><div className="art-orbit orbit-one"/><div className="art-orbit orbit-two"/><div className="poster-stack"><div className="stack-poster stack-back"><span>THE ART<br/>OF SEEING</span></div><div className="stack-poster stack-mid"><span>STORIES<br/>IN MOTION</span></div><div className="stack-poster stack-front"><div className="poster-sun"/><span>YOUR NEXT<br/><b>FAVOURITE</b><br/>IS OUT THERE.</span><small>CINELOG / VOL. 01</small></div></div><div className="floating-note"><Star size={13} fill="currentColor"/> 5.0 <span>FAVOURITE MATERIAL</span></div></div></section>
 <section className="section"><div className="section-heading"><div><div className="eyebrow">THE BIG SCREEN, RIGHT HERE</div><h2>Trending this week</h2></div><Link to="/films" className="text-link">View all <ChevronRight size={15}/></Link></div>{loading&&<div className="muted">Loading films…</div>}<MovieGrid movies={trending} ctx={ctx}/></section>
 <section className="section popular-section"><div className="section-heading"><div><div className="eyebrow">A GOOD PLACE TO START</div><h2>Popular right now</h2></div><span className="muted small">A few crowd favourites</span></div><MovieGrid movies={popular} ctx={ctx}/></section>
 <section className="join-banner"><div><div className="eyebrow">MAKE IT YOURS</div><h2>Your film life,<br/><em>all in one place.</em></h2><p>Build a record of what you watch. It’s your taste, your timeline, your story.</p></div><Link to="/diary" className="button">Start your diary <ChevronRight size={17}/></Link></section></>
}
function MovieGrid({movies,ctx}:{movies:Movie[];ctx:Ctx}) {
 return <div className="movie-grid">{movies.map(m=><MovieCard key={m.id} movie={m} ctx={ctx}/>)}</div>
}
function MovieCard({movie,ctx}:{movie:Movie;ctx:Ctx}) {
 return <article className="movie-card"><Link to={`/film/${movie.id}`} className="poster-link"><img src={imageUrl(movie.poster_path)} alt={`${movie.title} poster`} loading="lazy"/><div className="poster-hover"><span>VIEW FILM <ChevronRight size={15}/></span></div></Link><button className={`quick-save ${ctx.watchlist.includes(movie.id)?'saved':''}`} title="Add to watchlist" onClick={()=>ctx.toggleWatch(movie)}><Bookmark size={16} fill={ctx.watchlist.includes(movie.id)?'currentColor':'none'}/></button><div className="movie-meta"><Link to={`/film/${movie.id}`} className="movie-title">{movie.title}</Link><div><span>{movie.release_date?.slice(0,4)||'—'}</span><span className="rating-mini"><Star size={11} fill="currentColor"/> {movie.vote_average?.toFixed(1)||'—'}</span></div></div></article>
}
function Films({ctx}:{ctx:Ctx}) {
 const [movies,setMovies]=useState<Movie[]>(demoMovies)
 const [filter,setFilter]=useState('Trending')
 useEffect(()=>{(filter==='Popular'?getPopular():getTrending()).then(x=>setMovies(x.results)).catch(()=>setMovies(demoMovies))},[filter])
 return <section className="content-page"><div className="page-intro"><div className="eyebrow">THE MOVIE LIBRARY</div><h1>Find your <em>next film.</em></h1><p>Explore what’s moving, what’s beloved, and what you’ve been missing.</p></div><div className="filter-row"><div className="tabs"><button className={filter==='Trending'?'active':''} onClick={()=>setFilter('Trending')}>Trending</button><button className={filter==='Popular'?'active':''} onClick={()=>setFilter('Popular')}>Popular</button></div><span className="muted small">Powered by OMDb</span></div><MovieGrid movies={movies} ctx={ctx}/></section>
}
function FilmDetail({ctx}:{ctx:Ctx}) {
 const {id}=useParams();const [movie,setMovie]=useState<Movie|null>(null);const [detail,setDetail]=useState<any>(null);const [rating,setRating]=useState(0);const [body,setBody]=useState('');const [logging,setLogging]=useState(false)
 useEffect(()=>{if(id)getMovie(Number(id)).then(x=>{setMovie(x);setDetail(x)}).catch(()=>{const m=demoMovies.find(x=>x.id===Number(id))||demoMovies[0];setMovie(m);setDetail(m)})},[id])
 if(!movie)return <div className="loading-state">Finding your film…</div>
 return <div className="film-detail"><div className="detail-backdrop" style={{backgroundImage:`linear-gradient(90deg,#11130f 5%,rgba(17,19,15,.86) 48%,rgba(17,19,15,.35)),linear-gradient(0deg,#11130f,transparent),url(${imageUrl(movie.backdrop_path,'w1280')})`}}/><div className="detail-main"><img className="detail-poster" src={imageUrl(movie.poster_path)} alt={movie.title}/><div className="detail-copy"><div className="eyebrow">THE FEATURE PRESENTATION</div><h1>{movie.title}</h1><p className="detail-facts">{movie.release_date?.slice(0,4)} {detail?.runtime?`· ${detail.runtime} min`:''} {detail?.genres?.length?`· ${detail.genres.map((g:any)=>g.name).join(', ')}`:''}</p><div className="detail-rating"><Star fill="currentColor" size={18}/><strong>{movie.vote_average?.toFixed(1)}</strong><span>/ 10 IMDb</span></div>{detail?.tagline&&<p className="tagline">{detail.tagline}</p>}<p className="overview">{movie.overview||'A story waiting to be discovered.'}</p><div className="detail-actions"><button className="button" onClick={()=>setLogging(!logging)}><Plus size={16}/> Log this film</button><button className="button button-outline" onClick={()=>ctx.toggleWatch(movie)}><Bookmark size={16}/> {ctx.watchlist.includes(movie.id)?'In watchlist':'Watchlist'}</button></div>{logging&&<div className="log-panel"><h3>Log your viewing</h3><p className="muted small">How would you rate {movie.title}?</p><div className="star-picker">{[1,2,3,4,5].map(n=><button key={n} onClick={()=>setRating(n)} className={rating>=n?'chosen':''}><Star size={25} fill={rating>=n?'currentColor':'none'}/></button>)}</div><textarea value={body} onChange={e=>setBody(e.target.value)} placeholder="Add a few thoughts (optional)…"/><button className="button" disabled={!rating} onClick={()=>{ctx.logMovie(movie,rating,body);setLogging(false)}}>Save to diary</button></div>}</div></div><section className="section detail-reviews"><div className="section-heading"><div><div className="eyebrow">THE CONVERSATION</div><h2>Community reviews</h2></div><Link to="/community" className="text-link">All reviews <ChevronRight size={15}/></Link></div><ReviewList reviews={ctx.reviews.filter(r=>r.movie_id===movie.id)}/></section></div>
}
function Collection({title,subtitle,ids,ctx,empty}:{title:string;subtitle:string;ids:number[];ctx:Ctx;empty:string}) {
 const [movies,setMovies]=useState<Movie[]>([])
 useEffect(()=>{if(!ids.length){setMovies([]);return}Promise.all(ids.map(id=>getMovie(id).catch(()=>demoMovies.find(m=>m.id===id)).then(m=>m||null))).then(a=>setMovies(a.filter(Boolean) as Movie[]))},[ids.join(',')])
 return <section className="content-page"><div className="page-intro"><div className="eyebrow">YOUR COLLECTION</div><h1>{title.split(' ')[0]} <em>{title.split(' ').slice(1).join(' ')}</em></h1><p>{subtitle}</p></div>{!ctx.user&&<div className="empty-state"><Film size={30}/><h3>Make this space yours</h3><p>Sign in to save films to your personal collection.</p><button className="button" onClick={ctx.openAuth}>Sign in</button></div>}{ctx.user&&movies.length===0&&<div className="empty-state"><Bookmark size={30}/><h3>Nothing here just yet</h3><p>{empty}</p><Link to="/films" className="button">Discover films</Link></div>}{movies.length>0&&<MovieGrid movies={movies} ctx={ctx}/>}</section>
}
function ReviewList({reviews}:{reviews:Review[]}) {
 if(!reviews.length)return <div className="empty-inline">No reviews here yet. Be the first to share your take.</div>
 return <div className="review-list">{reviews.map(r=><article className="review-card" key={r.id}><img src={imageUrl(r.poster_path,'w92')} alt=""/><div className="review-content"><div className="review-byline"><strong>@{r.username}</strong><span>{new Date(r.created_at).toLocaleDateString()}</span></div><Link to={`/film/${r.movie_id}`} className="review-film">{r.movie_title}</Link><div className="review-stars">{'★'.repeat(Math.round(r.rating))}<span>{r.rating.toFixed(1)}</span></div><p>{r.body}</p></div><button className="icon-button like-button" title="Like review"><Heart size={17}/></button></article>)}</div>
}
function Community({reviews}:{reviews:Review[]}) {
 return <section className="content-page"><div className="page-intro"><div className="eyebrow">NOTES FROM THE CROWD</div><h1>People who <em>love film.</em></h1><p>Thoughts, feelings and the occasional hot take from the CineLog community.</p></div><ReviewList reviews={reviews}/></section>
}
function ProfilePage({ctx,signOut}:{ctx:Ctx;signOut:()=>void}) {
 if(!ctx.user)return <div className="empty-state profile-gate"><UserRound size={32}/><h2>Your profile is waiting.</h2><p>Sign in to see your diary, reviews and film stats.</p><button className="button" onClick={ctx.openAuth}>Sign in</button></div>
 return <section className="content-page"><div className="profile-hero"><div className="profile-avatar">{(ctx.user.display_name||ctx.user.username).slice(0,1).toUpperCase()}</div><div><div className="eyebrow">YOUR CINELOG PROFILE</div><h1>{ctx.user.display_name||ctx.user.username}</h1><p className="muted">@{ctx.user.username}</p><p>{ctx.user.bio||'A movie lover building a life in film.'}</p></div><button className="button button-outline signout" onClick={signOut}>Sign out</button></div><div className="profile-stats"><div><strong>{ctx.diary.length}</strong><span>FILMS LOGGED</span></div><div><strong>{ctx.reviews.length}</strong><span>REVIEWS</span></div><div><strong>{ctx.watchlist.length}</strong><span>WATCHLIST</span></div></div><h2 className="subheading">Recent reviews</h2><ReviewList reviews={ctx.reviews.filter(r=>r.username===ctx.user?.username)}/></section>
}
export default App
