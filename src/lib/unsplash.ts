export async function getCityPhoto(destination: string): Promise<string | null> {
  const accessKey = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY;
  if (!accessKey) return null;

  try {
    const query = encodeURIComponent(`${destination} city travel`);
    const res = await fetch(
      `https://api.unsplash.com/photos/random?query=${query}&orientation=landscape&content_filter=high`,
      {
        headers: { Authorization: `Client-ID ${accessKey}` },
        next: { revalidate: 86400 }, // cache for 24h per destination
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.urls?.regular ?? null;
  } catch {
    return null;
  }
}
