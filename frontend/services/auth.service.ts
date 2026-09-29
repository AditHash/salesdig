import API from "../api/api";

export const register = (data: {
    name: string;
    email: string;
    password: string;
}) => {
    return API.post("/workspace/register", data);
};

/* Login */
export const login = (data: {
    email: string;
    password: string;
}) => {
    return API.post("/auth/login", data);
};

/* Get Current User */
export const getMe = () => {
    return API.get("/auth/me");
};

/* Logout */
export const logout = () => {
    API.post("/auth/logout").catch(() => {});
    localStorage.removeItem("token");
};
