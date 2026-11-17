import { Router } from "express";
import { isValidObjectId } from "mongoose";
import { AppError } from "../errors/AppError";
import {Survey} from "../model/survey";

const router = Router();

router.get("/surveys/:id", async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) throw new AppError(404, "Survey not found");

  const survey = await Survey.findOne({ _id: id, status: "published" })
      .select("title description version questions")
      .lean();
  if (!survey) throw new AppError(404, "Survey not found");

  res.json(survey);
});

export default router;