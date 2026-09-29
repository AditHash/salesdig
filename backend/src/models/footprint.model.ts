import mongoose, { Schema, Document } from "mongoose";

export interface IFootprint extends Document {
    userId: string;
    action: string;
    page: string;
    meta?: string;
}

const FootprintSchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        action: {
            type: String,
            required: true
        },

        page: {
            type: String,
            required: true
        },

        meta: String
    },
    {
        timestamps: true
    }
);

export default mongoose.model<IFootprint>(
    "Footprint",
    FootprintSchema
);
