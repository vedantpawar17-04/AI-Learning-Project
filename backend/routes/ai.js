import express from "express";
import Quiz from "../models/Quiz.js";
import QuizAnswer from "../models/QuizAnswer.js";
import Subject from "../models/Subject.js";

let openaiClient = null;
try {
  const { OpenAI } = await import("openai");
  if (process.env.OPENAI_API_KEY) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
} catch {}

const router = express.Router();

function computeSubjectStats(answersBySubject) {
  const subjectStats = [];
  for (const [subjectName, records] of Object.entries(answersBySubject)) {
    const total = records.reduce((sum, r) => sum + (r.totalQuestions || 0), 0);
    const correct = records.reduce((sum, r) => sum + (r.correctAnswers || 0), 0);
    const averageScore = records.length > 0
      ? Math.round(records.reduce((s, r) => s + (r.score || 0), 0) / records.length)
      : 0;
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

    subjectStats.push({
      subject: subjectName,
      attempts: records.length,
      accuracy,
      averageScore,
    });
  }
  subjectStats.sort((a, b) => a.accuracy - b.accuracy);
  return subjectStats;
}

function suggestDifficulty(stats) {
  if (stats.length === 0) return "medium";
  const avgAcc = Math.round(stats.reduce((s, r) => s + r.accuracy, 0) / stats.length);
  if (avgAcc >= 80) return "hard";
  if (avgAcc >= 55) return "medium";
  return "easy";
}

router.get("/student/:studentId/analytics", async (req, res) => {
  try {
    const { studentId } = req.params;

    const quizAnswers = await QuizAnswer.find({ studentId })
      .populate({
        path: "quizId",
        populate: [{ path: "subjectId", select: "name" }, { path: "teacherId", select: "username" }],
        select: "title subjectId questions",
      })
      .sort({ completedAt: -1 });

    const answersBySubject = {};
    const topicBreakdown = {};

    for (const qa of quizAnswers) {
      const subjectName = qa?.quizId?.subjectId?.name || "Unknown";
      if (!answersBySubject[subjectName]) answersBySubject[subjectName] = [];
      answersBySubject[subjectName].push({
        score: qa.score,
        correctAnswers: qa.correctAnswers,
        totalQuestions: qa.totalQuestions,
        completedAt: qa.completedAt,
      });

      // Topic heuristic: derive from quiz title as a simple baseline
      const topic = (qa?.quizId?.title || "General").split(":")[0].trim();
      if (!topicBreakdown[topic]) topicBreakdown[topic] = { correct: 0, total: 0 };
      topicBreakdown[topic].correct += qa.correctAnswers || 0;
      topicBreakdown[topic].total += qa.totalQuestions || 0;
    }

    const subjectStats = computeSubjectStats(answersBySubject);
    const weakSubjects = subjectStats.filter(s => s.accuracy < 60).map(s => s.subject).slice(0, 3);
    const recommendedDifficulty = suggestDifficulty(subjectStats);

    const topicStats = Object.entries(topicBreakdown).map(([topic, v]) => ({
      topic,
      accuracy: v.total > 0 ? Math.round((v.correct / v.total) * 100) : 0,
    })).sort((a, b) => a.accuracy - b.accuracy);

    const recommendations = [];
    if (weakSubjects.length > 0) {
      recommendations.push(`Focus on ${weakSubjects.join(", ")}.`);
    }
    const weakestTopics = topicStats.filter(t => t.accuracy < 60).slice(0, 3).map(t => t.topic);
    if (weakestTopics.length > 0) {
      recommendations.push(`Review topics: ${weakestTopics.join(", ")}.`);
    }
    recommendations.push(`Next quiz difficulty: ${recommendedDifficulty}.`);

    res.json({
      subjectStats,
      weakSubjects,
      topicStats,
      recommendedDifficulty,
      recommendations,
    });
  } catch (err) {
    console.error("AI analytics error:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/tips", async (req, res) => {
  try {
    const { weakSubjects = [], weakestTopics = [] } = req.body || {};

    const prompt = `You are a helpful tutor. A student is weak in subjects: ${weakSubjects.join(", ") || "none"} and topics: ${weakestTopics.join(", ") || "none"}.\nGive 3 short, actionable study tips tailored to these areas. Keep each tip under 25 words.`;

    if (!openaiClient) {
      return res.json({
        tips: [
          "Revisit core definitions, then practice 5 problems per topic.",
          "Summarize mistakes after each quiz; write one-line fixes.",
          "Schedule 20-minute spaced reviews for the weakest topic daily.",
        ],
        model: "heuristic",
      });
    }

    const completion = await openaiClient.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a concise learning coach." },
        { role: "user", content: prompt },
      ],
      temperature: 0.4,
      max_tokens: 200,
    });

    const text = completion.choices?.[0]?.message?.content || "";
    const tips = text
      .split(/\n|\d+\.|-\s/)
      .map(t => t.trim())
      .filter(Boolean)
      .slice(0, 3);

    res.json({ tips, model: "openai" });
  } catch (err) {
    console.error("AI tips error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;


