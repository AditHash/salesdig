import API from "../api/api";

/* Log Activity */
export const track = (data: {
    action: string;
    page: string;
    meta?: string;
}) => {
    return API.post("/track", data);
};

/* My History with pagination + filters */
export const getMyFootprints = (params?: {
    page?: number; limit?: number; action?: string;
    dateFrom?: string; dateTo?: string; search?: string;
    export?: string;
}) => {
    return API.get("/track/me", { params });
};

/* My chart stats (aggregated server-side) */
export const getMyStats = () => {
    return API.get("/track/me/stats");
};
