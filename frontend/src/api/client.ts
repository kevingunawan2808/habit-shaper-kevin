import type { Habit, HabitType, HabitWithLogs, Goal, User, LogStatus } from '../types';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token');
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Request failed');
  return json.data as T;
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<{ token: string; userId: number }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    register: (email: string, password: string, timezone: string) =>
      request<{ token: string; userId: number }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, timezone }),
      }),
    me: () => request<User>('/auth/me'),
  },
  habits: {
    list: () => request<Habit[]>('/habits'),
    create: (data: { name: string; type: HabitType }) =>
      request<Habit>('/habits', { method: 'POST', body: JSON.stringify(data) }),
    mark: (id: number, status: LogStatus) =>
      request<void>(`/habits/${id}/mark`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    weekly: (startDate: string, endDate: string) =>
      request<HabitWithLogs[]>(`/habits/weekly?startDate=${startDate}&endDate=${endDate}`),
  },
  goals: {
    list: () => request<Goal[]>('/goals'),
    create: (data: { name: string; description?: string; start_date?: string; end_date?: string }) =>
      request<Goal>('/goals', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: { name: string; description?: string; start_date?: string; end_date?: string }) =>
      request<Goal>(`/goals/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) =>
      request<void>(`/goals/${id}`, { method: 'DELETE' }),
    linkHabit: (goalId: number, habitId: number) =>
      request<void>(`/goals/${goalId}/habits/${habitId}`, { method: 'POST' }),
  },
};
