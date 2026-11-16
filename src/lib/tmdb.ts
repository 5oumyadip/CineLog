
const KEY = import.meta.env.VITE_OMDB_API_KEY as string | undefined
const BASE = 'https://www.omdbapi.com/'

export type Movie = {
  id: number
  title: string
  overview: string
  poster_path: string | null
  backdrop_path: string | null
  release_date: string
  vote_average: number
  genre_ids?: number[]
}

type OMDbMovie = {
  imdbID: string
  Title: string
  Year: string
  Poster: string
  Plot?: string
  imdbRating?: string
  Genre?: string
  Runtime?: string
  Response: string
  Error?: string
}

type OMDbSearchResponse = {
  Search?: OMDbMovie[]
  Response: string
  Error?: string
}

function normalizeMovie(data: OMDbMovie): Movie {
  return {
    // Keep the numeric part of the IMDb ID for your existing routes.
    id: Number(data.imdbID.replace('tt', '')),
    title: data.Title,
    overview: data.Plot && data.Plot !== 'N/A' ? data.Plot : '',
    poster_path: data.Poster && data.Poster !== 'N/A' ? data.Poster : null,
    backdrop_path: null,
    release_date:
      data.Year && data.Year !== 'N/A'
        ? `${data.Year.slice(0, 4)}-01-01`
        : '',
    vote_average:
      data.imdbRating && data.imdbRating !== 'N/A'
        ? Number(data.imdbRating)
        : 0,
  }
}

async function request(params: Record<string, string>) {
  if (!KEY) {
    throw new Error('Add your OMDb API key to the .env file.')
  }

  const url = new URL(BASE)
  url.search = new URLSearchParams({
    apikey: KEY,
    ...params,
  }).toString()

  const response = await fetch(url.toString())

  if (!response.ok) {
    throw new Error('Could not connect to OMDb.')
  }

  const data = await response.json()

  if (data.Response === 'False') {
    throw new Error(data.Error || 'Movie not found.')
  }

  return data
}

// OMDb provides full poster URLs, unlike TMDB.
export const imageUrl = (path: string | null, _size = 'w500') =>
  path || 'https://placehold.co/500x750/202522/e8eadf?text=No+Poster'

// Search movies.
export async function searchMovies(q: string) {
  const data = (await request({
    s: q,
    type: 'movie',
    page: '1',
  })) as OMDbSearchResponse

  return {
    results: (data.Search || []).map(normalizeMovie),
  }
}

// Fetch a movie using its IMDb ID.
async function getMovieByImdbId(imdbId: string) {
  const data = (await request({
    i: imdbId,
    plot: 'full',
  })) as OMDbMovie

  return {
    ...normalizeMovie(data),
    runtime: data.Runtime && data.Runtime !== 'N/A'
      ? Number.parseInt(data.Runtime, 10)
      : null,
    genres: data.Genre && data.Genre !== 'N/A'
      ? data.Genre.split(',').map((name, index) => ({
          id: index,
          name: name.trim(),
        }))
      : [],
    tagline: '',
  }
}

// Your existing App.tsx uses numeric IDs in its routes.
export function getMovie(id: number) {
  const imdbId = `tt${String(id).padStart(7, '0')}`
  return getMovieByImdbId(imdbId)
}

// OMDb does not have trending or popular endpoints.
// These are curated film collections, not live rankings.
const trendingIds = [
  'tt15398776', // Oppenheimer
  'tt15239678', // Dune: Part Two
  'tt1517268',  // Barbie
  'tt9362722',  // Spider-Man: Across the Spider-Verse
  'tt6751668',  // Parasite
  'tt0109830',  // Forrest Gump
  'tt0816692',  // Interstellar
  'tt0468569',  // The Dark Knight
]

const popularIds = [
  'tt0111161', // The Shawshank Redemption
  'tt0068646', // The Godfather
  'tt0137523', // Fight Club
  'tt1375666', // Inception
  'tt0120737', // The Lord of the Rings
  'tt0133093', // The Matrix
]

async function getCollection(ids: string[]) {
  const results = await Promise.allSettled(
    ids.map(id => getMovieByImdbId(id))
  )

  return {
    results: results
      .filter(
        (result): result is PromiseFulfilledResult<Awaited<ReturnType<typeof getMovieByImdbId>>> =>
          result.status === 'fulfilled'
      )
      .map(result => result.value),
  }
}

export const getTrending = () => getCollection(trendingIds)
export const getPopular = () => getCollection(popularIds)
