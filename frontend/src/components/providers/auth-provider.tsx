import { User } from '@/lib/types';
import React, { createContext, useState, useEffect, useContext } from 'react';

interface AuthContextProps {
    user: User | null;
    token: string | null;
    login: (userData: { user: User; accessToken: string; refreshToken: string }) => void;
    logout: () => void;
    loading: boolean;
}

export const AuthContext = createContext<AuthContextProps>({
    user: null,
    token: null,
    login: () => { },
    logout: () => { },
    loading: false
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const getTokenExpiration = (token: string): number | null => {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.exp ? payload.exp * 1000 : null;
        } catch (error) {
            console.error("Failed to parse token:", error);
            return null;
        }
    };

    const refreshAccessToken = async () => {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
            logout();
            return;
        }

        try {
            const response = await fetch(import.meta.env.VITE_API_URL + "/auth/refresh", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ refreshToken }),
            });

            if (!response.ok) {
                logout();
                return;
            }

            const data = await response.json();
            setToken(data.accessToken);
            localStorage.setItem('token', data.accessToken);
        } catch (error) {
            console.error("Error refreshing token:", error);
            logout();
        }
    };

    // Login function
    const login = (userData: { user: User; accessToken: string; refreshToken: string }) => {
        setUser(userData.user);
        setToken(userData.accessToken);
        localStorage.setItem('token', userData.accessToken);
        localStorage.setItem('refreshToken', userData.refreshToken);
        localStorage.setItem('user', JSON.stringify(userData.user));
    };

    // Logout function
    const logout = () => {
        setUser(null);
        setToken(null);
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
    };

    // Effect to check token validity and refresh if needed
    useEffect(() => {
        setLoading(true);
        const storedToken = localStorage.getItem('token');
        const storedRefreshToken = localStorage.getItem('refreshToken');
        const storedUser = localStorage.getItem('user');

        if (storedToken && storedRefreshToken && storedUser) {
            const expiration = getTokenExpiration(storedToken);

            if (expiration && expiration < Date.now()) {
                refreshAccessToken();
            } else {
                setToken(storedToken);
            }

            setUser(JSON.parse(storedUser));
        }

        setLoading(false);
    }, []);

    return (
        <AuthContext.Provider value={{ user, token, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};
