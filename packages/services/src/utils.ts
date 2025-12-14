export async function sha1(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-1", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function parseRepo(repo: string): { owner: string; name: string } | null {
  const parts = repo.split("/");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return null;
  }
  return { owner: parts[0], name: parts[1] };
}

export function buildSearchQuery(params: {
  repo: string;
  term: string;
  strict?: boolean;
  category?: string;
  hash?: string;
}): string {
  const searchTerm = params.strict && params.hash ? params.hash : params.term;
  const searchIn = params.strict ? "in:body" : "in:title";
  const categoryFilter = params.category ? ` category:${params.category}` : "";
  return `"${searchTerm}" ${searchIn} repo:${params.repo}${categoryFilter}`;
}
