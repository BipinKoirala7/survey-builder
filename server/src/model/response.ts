import { Schema, model } from "mongoose";

const responseSchema = new Schema(
    {
        surveyId: { type: Schema.Types.ObjectId, ref: "Survey", required: true, index: true },
        surveyVersion: { type: Number, required: true },
        answers: { type: Schema.Types.Mixed, required: true }, // { [questionId]: string | string[] | number }
        submittedAt: { type: Date, default: Date.now },
    },
    { minimize: false },
);

export const Response = model("Response", responseSchema);