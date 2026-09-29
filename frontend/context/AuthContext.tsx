import React, { createContext, useContext, useEffect, useState } from "react";
import { getMe } from "../services/auth.service";

interface User {
    id: string;
    name: string;
    email: string;
    role: "user" | "admin";
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    setUser: (u: User | null) => void;
}

const AuthContext = createContext<AuthContextType>(
    {} as AuthContextType
);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
    children
}) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initAuth = async () => {
            if (!localStorage.getItem('token')) {
                setLoading(false);
                return;
            }
            try {
                const res = await getMe();
                setUser({ ...res.data, id: res.data._id ?? res.data.id });
            } catch {
                localStorage.removeItem('token');
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        initAuth();
    }, []);

    return (
        <AuthContext.Provider
            value={{ user, loading, setUser }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
