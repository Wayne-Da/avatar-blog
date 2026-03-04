// Shared Miniflux API client
// Reads MINIFLUX_BASE_URL and MINIFLUX_API_KEY from process.env

const BASE_URL = () => process.env.MINIFLUX_BASE_URL || 'http://localhost:8080';
const API_KEY = () => process.env.MINIFLUX_API_KEY;

export async function minifluxApi(method, path, body = null) {
  const key = API_KEY();
  if (!key) {
    throw new Error('MINIFLUX_API_KEY is not set');
  }

  const url = `${BASE_URL()}${path}`;
  const options = {
    method,
    headers: {
      'X-Auth-Token': key,
      'Content-Type': 'application/json',
    },
  };

  if (body !== null) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(url, options);

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Miniflux API ${method} ${path} failed (${res.status}): ${text}`);
  }

  if (res.status === 204) {
    return null;
  }

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return res.json();
  }

  return null;
}

export async function resolveCategoryId(categoryName) {
  const categories = await minifluxApi('GET', '/v1/categories');
  const match = categories.find((c) => c.title === categoryName);
  return match ? match.id : null;
}

export async function createCategory(categoryName) {
  const result = await minifluxApi('POST', '/v1/categories', { title: categoryName });
  return result.id;
}

export async function updateFeed(feedId, changes) {
  return minifluxApi('PUT', `/v1/feeds/${feedId}`, changes);
}

export async function markEntriesAsRead(entryIds) {
  if (!entryIds || entryIds.length === 0) return;
  await minifluxApi('PUT', '/v1/entries', {
    entry_ids: entryIds.map(Number),
    status: 'read',
  });
}
