// src/shared/api/auth.ts
import { API_URL } from '../../app/config';

export interface LoginResponse {
    access_token: string;
    token_string: string;
}

export interface UserProfile {
    email: string;
    id?: number;
}

export const login = async (email: string, password: string): Promise<LoginResponse> => {
    const formData = new URLSearchParams();
    formData.append('username', email); //map email input 'username'
    formData.append('password', password);

    const response = await fetch(`${API_URL}/v1/auth/login`, {
        method: 'POST',
        body: formData,
    });


    if (!response.ok) {
        throw new Error('Login failed');
    }
    return response.json();
};

export const register = async (email:string, password: string): Promise<UserProfile> => {
  const response = await fetch(`${API_URL}/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new Error('Registration failed');
  }
  return response.json();
};

// fetch current user profile
export const getMe = async (token: string): Promise<UserProfile> => {

    if (!token) {
      throw new Error("No access token provided");
    }
  
    const response = await fetch(`${API_URL}/v1/auth/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to fetch user profile (${response.status}): ${text}`);
    }
  
    return response.json();
  };