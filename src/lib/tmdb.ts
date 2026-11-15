const KEY = import.meta.env.VITE_TMDB_API_KEY as string | undefined
const BASE = 'https://api.themoviedb.org/3'

export type Movie = {
  id: number; title: string; overview: string; poster_path: string | null; backdrop_path: string | null
  release_date: string; vote_average: number; genre_ids?: number[]
}
export const imageUrl = (path: string | null, size = 'w500') =>
  path ? `https://image.tmdb.org/t/p/${size}${path}` : 'https://placehold.co/500x750/202522/e8eadf?text=No+Poster'

async function request<T>(path: string): Promise<T> {
  if (!KEY) throw new Error('Add your TMDB API key to .env to load live movie data.')
  const res = await fetch(`${BASE}${path}${path.includes('?') ? '&' : '?'}api_key=${KEY}`)
  if (!res.ok) throw new Error('Could not load movie data. Check your TMDB API key.')
  return res.json()
}
export const getTrending = () => request<{results: Movie[]}>('/trending/movie/week')
export const getPopular = () => request<{results: Movie[]}>('/movie/popular')
export const searchMovies = (q: string) => request<{results: Movie[]}>(`/search/movie?query=${encodeURIComponent(q)}`)
export const getMovie = (id: number) => request<Movie & {genres: {id:number;name:string}[]; runtime:number; tagline:string; credits?:unknown}>(`/movie/${id}?append_to_response=credits`)
