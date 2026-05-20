import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import type { AuthResponse, AuthUser, LoginInput } from "@/types/auth";

export async function login(input: LoginInput) {
  const { data } = await api.post<AuthResponse>("/auth/login", input);
  useAuthStore.getState().setSession(data.accessToken, data.user);
  return data;
}

export async function refreshSession() {
  const { data } = await api.post<AuthResponse>("/auth/refresh");
  useAuthStore.getState().setSession(data.accessToken, data.user);
  return data;
}

export async function getMe() {
  const { data } = await api.get<{ user: AuthUser }>("/auth/me");
  return data.user;
}

export async function logout() {
  try {
    await api.post("/auth/logout");
  } finally {
    useAuthStore.getState().clearSession();
  }
}
