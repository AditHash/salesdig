import API from "../api/api";

/* All Users */
export const getUsers = () => {
    return API.get("/admin/users");
};

/* Create User */
export const createUser = (data: any) => {
    return API.post("/admin/users", data);
};

/* All Footprints with pagination + filters */
export const getFootprints = (params?: {
    page?: number; limit?: number; action?: string;
    dateFrom?: string; dateTo?: string; search?: string; userId?: string;
    export?: string;
}) => {
    return API.get("/admin/footprints", { params });
};

/* Analysis KPIs (aggregated server-side) */
export const getAnalysisKpis = () => {
    return API.get("/admin/footprints/kpis");
};

/* General chart stats (aggregated server-side) */
export const getFootprintStats = () => {
    return API.get("/admin/footprints/stats");
};

export const blockUser = (id: string, isBlocked: boolean) => {
    return API.patch(`/admin/users/${id}/block`, { isBlocked });
}

export const resetPassword = (id: string, password: string) => {
    return API.patch(`/admin/users/${id}/password`, { password });
}

export const resendInvite = (id: string) => API.post(`/admin/users/${id}/resend-invite`, {});
