import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:4000";

const TOKEN_KEY = "auth_token";

let inMemoryToken: string | null = null;

export async function setToken(token: string | null) {
  inMemoryToken = token;
  if (token) await AsyncStorage.setItem(TOKEN_KEY, token);
  else await AsyncStorage.removeItem(TOKEN_KEY);
}

export async function loadToken(): Promise<string | null> {
  if (inMemoryToken) return inMemoryToken;
  inMemoryToken = await AsyncStorage.getItem(TOKEN_KEY);
  return inMemoryToken;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  auth?: boolean; // attach bearer token if available
}

export async function api<T = unknown>(
  path: string,
  { method = "GET", body, auth = true }: RequestOptions = {}
): Promise<T> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (auth) {
    const token = await loadToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(res.status, (data as { error?: string }).error ?? "حدث خطأ ما");
  }
  return data as T;
}

export { API_URL };
