import React, { useState } from "react";
import { login } from "../services/auth.service";
import { useAuth } from "../context/AuthContext";

import { useNavigate } from "react-router-dom";

const LoginView = () => {
    const { setUser } = useAuth();
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const res = await login({ email, password });

            localStorage.setItem("token", res.data.token);
            setUser(res.data.user);

        } catch (err: any) {
            setError(err.response?.data?.message || "Invalid credentials");
        }
    };

    return (
        <div className="flex justify-center items-center h-full">
            <form
                onSubmit={handleSubmit}
                className="bg-white p-8 rounded-xl shadow-xl w-96"
            >
                <h2 className="text-2xl font-bold mb-6 text-center">
                    Login
                </h2>

                {error && (
                    <p className="text-red-500 text-sm mb-3">
                        {error}
                    </p>
                )}

                <input
                    className="w-full mb-3 px-4 py-2 border rounded-lg"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />

                <input
                    type="password"
                    className="w-full mb-4 px-4 py-2 border rounded-lg"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />

                <button
                    className="w-full bg-teal-600 text-white py-2 rounded-lg font-bold hover:bg-teal-700"
                >
                    Login
                </button>
            </form>
        </div>
    );
};

export default LoginView;
