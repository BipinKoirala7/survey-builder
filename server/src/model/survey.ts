import { Schema, model } from "mongoose";

const showIfSchema = new Schema(
    { questionId: String, operator: String, value: Schema.Types.Mixed },
    { _id: false },
);

const questionSchema = new Schema(
    {
        id: { type: String, required: true }, // stable UUID, never the array index
        type: { type: String, enum: ["text", "single", "multi", "rating"], required: true },
        label: { type: String, required: true },
        required: { type: Boolean, default: false },
        order: { type: Number, required: true },
        options: { type: [String], default: [] },
        showIf: { type: showIfSchema, default: null },
    },
    { _id: false },
);

const surveySchema = new Schema(
    {
        title: { type: String, required: true },
        description: { type: String, default: "" },
        status: { type: String, enum: ["draft", "published"], default: "draft" },
        version: { type: Number, default: 1 },
        questions: { type: [questionSchema], default: [] },
        owner: { type: Schema.Types.ObjectId, ref: "Admin", required: true, index: true },
    },
    { timestamps: true },
);

export const Survey = model("Survey", surveySchema);