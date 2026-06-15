"use client";

import React, { useState, useEffect } from "react";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Button,
  Slider,
  Input,
  Card,
  Chip,
  Progress,
  Select,
  SelectItem,
  Tabs,
  Tab,
  Textarea
} from "@nextui-org/react";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";


const columns = [
  {
    key: "question",
    label: "Evaluation Questions",
  },
  {
    key: "rating",
    label: "Candidate Response Rating",
  },
];

export default function App({ interview, user }) {
  const role = interview.jobPosition || "Candidate";
  const qualifications = interview.skillSets ? interview.skillSets : "General Specific Skills";

  const isCompletedStatus = (s) => s === "completed" || s === "selected" || s === "rejected";

  const [difficulty, setDifficulty] = useState(1);
  const [feedbackScore, setFeedbackScore] = useState(undefined);
  const [score, setScore] = useState(
    (isCompletedStatus(interview.status) || interview.expertStatus === 'completed')
      ? (interview.totalScore || 0)
      : 0
  );
  const [questions, setQuestions] = useState(interview.questions || []);
  const [endInterview, setEndInterview] = useState(
    isCompletedStatus(interview.status) || interview.expertStatus === 'completed'
  );
  const [customQuestion, setCustomQuestion] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(interview.status || 'pending');

  // Resume-Aware AI Question State
  const [expLevel, setExpLevel] = useState("Mid-Level");
  const [specVal, setSpecVal] = useState(user?.specialization || interview.skillSets || "Fullstack");
  const [targetLvl, setTargetLvl] = useState("mid");
  const [focusAreas, setFocusAreas] = useState(interview.jobPosition || interview.role || "Software Development");
  const [qCount, setQCount] = useState(3);
  const [customPrompt, setCustomPrompt] = useState("");
  const [aiQuestions, setAiQuestions] = useState(null);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [activeAiTab, setActiveAiTab] = useState("");
  const [expertVerdict, setExpertVerdict] = useState("select");
  const [expertNotes, setExpertNotes] = useState("");


  const router = useRouter();

  useEffect(() => {
    if (interview) {
      setQuestions(interview.questions || []);
      const completed = isCompletedStatus(interview.status) || interview.expertStatus === 'completed';
      setEndInterview(completed);
      setScore(completed ? (interview.totalScore || 0) : 0);
      setStatus(interview.status || 'pending');
      setExpertVerdict(interview.expertVerdict || "select");
      setExpertNotes(interview.expertNotes || "");
    }
  }, [interview]);


  const generateResumeAwareQuestions = async () => {
    setGeneratingAi(true);
    try {
      const response = await fetch("/api/generateQuestions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          interviewId: interview._id,
          experienceLevel: expLevel,
          expertSpecialization: specVal,
          targetLevel: targetLvl,
          focusAreas: focusAreas,
          customPrompt: customPrompt,
          questionCount: qCount
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to generate AI questions");
        return;
      }

      const data = await response.json();
      if (data.questions) {
        setAiQuestions(data.questions);
        if (data.questions.interviewStructure && data.questions.interviewStructure.length > 0) {
          setActiveAiTab(data.questions.interviewStructure[0].category);
        }
        toast.success("AI Questionnaire generated successfully!");
      } else {
        toast.error("Invalid response format received");
      }
    } catch (err) {
      console.error("Error generating resume-aware questions:", err);
      toast.error("Error communicating with AI service");
    } finally {
      setGeneratingAi(false);
    }
  };

  const persistInterviewData = async (updatedQuestions) => {
    try {
      const currentQuestions = updatedQuestions || questions;
      const currentTotalScore = currentQuestions.reduce((sum, q) => sum + q.rating, 0);
      const currentMaxScore = currentQuestions.length * 5;

      const res = await fetch("/api/interviews/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          interviewId: interview._id,
          questions: currentQuestions.map(q => ({
            key: q.key,
            question: q.question,
            rating: q.rating
          })),
          totalScore: currentTotalScore,
          maxScore: currentMaxScore
        }),
      });

      if (!res.ok) {
        console.error("Failed to auto-save interview data:", res.statusText);
      }
    } catch (error) {
      console.error("Error auto-saving interview data:", error);
    }
  };

  const addGeneratedQuestion = (questionText) => {
    if (!questionText || questionText.trim() === "") return;
    const newQuestion = {
      key: questions.length + 1,
      question: questionText.trim(),
      rating: 3,
    };
    const updated = [...questions, newQuestion];
    setQuestions(updated);
    toast.success("Question added to interview checklist!");
    persistInterviewData(updated);
  };

  const handleRatingChange = (key, newRating) => {
    const updated = questions.map((q) =>
      q.key === key ? { ...q, rating: newRating } : q
    );
    setQuestions(updated);

    // Track feedback rating of the latest question
    if (questions.length > 0) {
      setFeedbackScore(newRating);
    }
  };

  const addCustomQuestion = () => {
    if (customQuestion.trim() === "") {
      toast.error("Please enter a question first.");
      return;
    }
    const newQuestion = {
      key: questions.length + 1,
      question: customQuestion.trim(),
      rating: 3
    };
    const updated = [...questions, newQuestion];
    setQuestions(updated);
    setCustomQuestion("");
    toast.success("Custom question added to evaluation!");
    persistInterviewData(updated);
  };


  const totalscore = questions.reduce((sum, q) => sum + q.rating, 0);
  const maxScore = questions.length * 5;
  const scorePercent = maxScore > 0 ? Math.round((totalscore / maxScore) * 100) : 0;

  const updateInterviewData = async () => {
    setSaving(true);
    try {
      console.log("Updating interview data...");
      const res = await fetch("/api/interviews/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          interviewId: interview._id,
          questions: questions.map(q => ({
            key: q.key,
            question: q.question,
            rating: q.rating
          })),
          totalScore: totalscore,
          maxScore: maxScore,
          status: "completed",
          verdict: expertVerdict,
          notes: expertNotes
        }),
      });

      if (!res.ok) {
        toast.error("Failed to submit evaluation data.");
        console.error("Failed to update interview:", res.statusText);
        return;
      }

      setEndInterview(true);
      setStatus("completed");
      toast.success("Interview completed and saved successfully!");
    } catch (error) {
      console.error("Error updating interview data:", error);
      toast.error("Error ending evaluation");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    try {
      const res = await fetch("/api/interviews/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          interviewId: interview._id,
          status: newStatus,
        }),
      });

      if (!res.ok) {
        toast.error("Failed to update candidate status.");
        return;
      }

      setStatus(newStatus);
      toast.success(`Candidate status updated to ${newStatus}!`);
      router.push('/dashboard');
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Error updating candidate status");
    }
  };

  const getDifficultyLabel = (val) => {
    switch (val) {
      case 1: return "Easy";
      case 2: return "Medium-Easy";
      case 3: return "Medium";
      case 4: return "Medium-Hard";
      case 5: return "Expert / Hard";
      default: return "Medium";
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Overview Info Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className={`${user?.role === 'candidate' ? 'md:col-span-3' : 'md:col-span-2'} p-6 bg-white shadow-sm border border-gray-100 flex flex-col justify-between`}>
          <div>
            <h2 className="text-xs uppercase tracking-wider text-gray-400 font-bold">Interview Profile</h2>
            <p className="text-2xl font-bold text-gray-800 mt-1 capitalize">{role}</p>
            <p className="text-sm text-gray-500 mt-2">
              <span className="font-semibold text-gray-700">Skills / Focus:</span> {qualifications}
            </p>
            {interview.expertName && (
              <p className="text-sm text-gray-500 mt-1">
                <span className="font-semibold text-gray-700">Host Expert:</span> {interview.expertName}
              </p>
            )}
          </div>
          <div className="mt-4 flex gap-2">
            <Chip
              color={status === "selected" ? "success" : (status === "rejected" ? "danger" : (status === "completed" ? "primary" : "warning"))}
              variant="flat"
              className="capitalize font-semibold text-xs"
            >
              Status: {status}
            </Chip>
            <Chip color="primary" variant="flat">
              Target Candidate: {interview.email || "N/A"}
            </Chip>
          </div>
        </Card>

        {user?.role !== 'candidate' && (
          <Card className="p-6 bg-gradient-to-br from-indigo-50 to-white shadow-sm border border-indigo-100 flex flex-col justify-between">
            <div>
              <h2 className="text-xs uppercase tracking-wider text-indigo-400 font-bold">Evaluation Metrics</h2>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-indigo-700">{totalscore}</span>
                <span className="text-gray-400 text-sm">/ {maxScore} max pts</span>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                Based on {questions.length} question(s) asked
              </div>
            </div>
            <div className="mt-4">
              <Progress
                value={scorePercent}
                color={scorePercent > 70 ? "success" : (scorePercent > 40 ? "warning" : "danger")}
                size="sm"
                className="max-w-full"
              />
              <div className="flex justify-between items-center mt-1">
                <span className="text-xs text-gray-400 font-medium">Evaluation Performance</span>
                <span className="text-xs font-bold text-indigo-600">{scorePercent}%</span>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* AI Resume-Aware Questionnaire Assistant */}
      {!endInterview && (user?.role === 'expert' || user?.role === 'hr') && (
        <Card className="p-6 bg-white border border-indigo-150 shadow-md rounded-2xl space-y-6">
          <div className="border-b border-gray-100 pb-3 flex justify-between items-start flex-wrap gap-4">
            <div>
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <span className="text-indigo-650">✨</span> AI Resume-Aware Questionnaire Assistant
              </h3>
              <p className="text-xs text-gray-400">Pre-generate a structured set of interview questions matched to the candidate resume and level</p>
            </div>
            <Chip
              color={interview.extractedText ? "success" : "warning"}
              variant="flat"
              className="text-[10px] font-bold"
            >
              {interview.extractedText ? "✓ Resume Text Loaded" : "⚠ Fallback Mode (No Resume)"}
            </Chip>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-bold text-gray-550 mb-1.5 uppercase tracking-wider">
                Candidate Exp Level
              </label>
              <Select
                aria-label="Experience Level"
                variant="bordered"
                selectedKeys={new Set([expLevel])}
                onSelectionChange={(keys) => setExpLevel(Array.from(keys)[0])}
                className="w-full text-sm font-semibold"
              >
                <SelectItem key="Junior" textValue="Junior / Associate">Junior / Associate</SelectItem>
                <SelectItem key="Mid-Level" textValue="Mid-Level Professional">Mid-Level Professional</SelectItem>
                <SelectItem key="Senior" textValue="Senior / Lead Architect">Senior / Lead Architect</SelectItem>
                <SelectItem key="Expert" textValue="Subject Matter Expert / Director">Subject Matter Expert / Director</SelectItem>
              </Select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-550 mb-1.5 uppercase tracking-wider">
                Target Level
              </label>
              <Select
                aria-label="Target Level"
                variant="bordered"
                selectedKeys={new Set([targetLvl])}
                onSelectionChange={(keys) => setTargetLvl(Array.from(keys)[0])}
                className="w-full text-sm font-semibold"
              >
                <SelectItem key="intern" textValue="Internship">Internship</SelectItem>
                <SelectItem key="fresher" textValue="Fresher / Entry-Level">Fresher / Entry-Level</SelectItem>
                <SelectItem key="junior" textValue="Junior Engineer">Junior Engineer</SelectItem>
                <SelectItem key="mid" textValue="Mid-Level Engineer">Mid-Level Engineer</SelectItem>
                <SelectItem key="senior" textValue="Senior / Lead Engineer">Senior / Lead Engineer</SelectItem>
              </Select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-550 mb-1.5 uppercase tracking-wider">
                Questions / Category
              </label>
              <Select
                aria-label="Questions count"
                variant="bordered"
                selectedKeys={new Set([String(qCount)])}
                onSelectionChange={(keys) => setQCount(Number(Array.from(keys)[0]))}
                className="w-full text-sm font-semibold"
              >
                <SelectItem key="1" textValue="1 Question">1 Question</SelectItem>
                <SelectItem key="2" textValue="2 Questions">2 Questions</SelectItem>
                <SelectItem key="3" textValue="3 Questions">3 Questions</SelectItem>
                <SelectItem key="4" textValue="4 Questions">4 Questions</SelectItem>
                <SelectItem key="5" textValue="5 Questions">5 Questions</SelectItem>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-gray-550 mb-1.5 uppercase tracking-wider">
                Focus Areas
              </label>
              <Input
                aria-label="Focus Areas"
                variant="bordered"
                value={focusAreas}
                onChange={(e) => setFocusAreas(e.target.value)}
                placeholder="e.g. System Design, Backend, Machine Learning"
                className="w-full text-sm font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-550 mb-1.5 uppercase tracking-wider">
                Expert Specialization
              </label>
              <Input
                aria-label="Expert Specialization"
                variant="bordered"
                value={specVal}
                onChange={(e) => setSpecVal(e.target.value)}
                placeholder="e.g. Distributed Systems, Frontend"
                className="w-full text-sm font-semibold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-550 mb-1.5 uppercase tracking-wider">
              Custom Prompt / Specific Question Guidelines (Optional)
            </label>
            <Textarea
              aria-label="Custom Prompt Guidelines"
              variant="bordered"
              placeholder="e.g. focus on their Kubernetes experience, probe their choices of NoSQL vs SQL, or ask them about React 18 concurrent rendering..."
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              minRows={2}
              className="w-full text-sm font-semibold"
            />
          </div>


          <Button
            onClick={generateResumeAwareQuestions}
            isLoading={generatingAi}
            color="secondary"
            className="w-full font-bold shadow-md h-12 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl"
          >
            ✨ Generate Questions
          </Button>

          {aiQuestions && aiQuestions.interviewStructure && (
            <div className="border-t border-gray-100 pt-4 space-y-4">
              <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wider">Select Questions to Add to Interview Checklist:</h4>
              <Tabs
                aria-label="Generated Question Categories"
                selectedKey={activeAiTab}
                onSelectionChange={setActiveAiTab}
                color="secondary"
                variant="flat"
                size="sm"
              >
                {aiQuestions.interviewStructure.map((sec) => (
                  <Tab key={sec.category} title={sec.category} />
                ))}
              </Tabs>

              {(() => {
                const activeSection = aiQuestions.interviewStructure.find(sec => sec.category === activeAiTab);
                if (!activeSection) return null;
                return (
                  <div className="space-y-3 mt-2">
                    <div className="p-3 bg-indigo-50/40 rounded-xl border border-indigo-100 flex flex-col md:flex-row justify-between md:items-center gap-2">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-indigo-500">Objective</span>
                        <p className="text-xs text-indigo-955 font-medium">{activeSection.objective}</p>
                      </div>
                      <div className="shrink-0">
                        <span className="text-[10px] uppercase font-bold text-indigo-500 block">Difficulty</span>
                        <Chip size="sm" color="secondary" variant="flat" className="capitalize text-[10px] font-bold">
                          {activeSection.difficulty}
                        </Chip>
                      </div>
                    </div>

                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                      {activeSection.questions && activeSection.questions.length > 0 ? (
                        activeSection.questions.map((qText, index) => (
                          <div
                            key={index}
                            className="p-3 bg-gray-50 border border-gray-150 rounded-xl flex justify-between items-center gap-4 hover:border-indigo-300 transition duration-250"
                          >
                            <p className="text-xs text-gray-700 font-normal leading-relaxed flex-1">{qText}</p>
                            <Button
                              size="sm"
                              color="primary"
                              variant="flat"
                              className="font-bold text-[10px] shrink-0"
                              onClick={() => addGeneratedQuestion(qText)}
                            >
                              ➕ Add
                            </Button>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-gray-400 italic py-2 text-center">No questions generated for this category.</p>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </Card>
      )}

      {/* Questions List Card */}
      <Card className="p-6 bg-white shadow-md border border-gray-150 rounded-2xl">
        <div className="mb-4 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-800">Assigned Questions & Live Scores</h3>
          <Chip size="sm" color="default" variant="bordered">
            {questions.length} Active Questions
          </Chip>
        </div>

        {questions.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-100 rounded-xl">
            <p className="text-gray-500 font-medium">No questions added yet.</p>
            <p className="text-xs text-gray-400 mt-1">Use the panel below to generate AI questions or add manual ones.</p>
          </div>
        ) : (
          <Table
            aria-label="Evaluation Questions Table"
            shadow="none"
            className="border-none mt-2"
          >
            <TableHeader>
              <TableColumn className="bg-gray-50 text-gray-700 font-semibold text-sm py-3">
                Evaluation Questions
              </TableColumn>
              {user?.role !== 'candidate' && (
                <TableColumn className="bg-gray-50 text-gray-700 font-semibold text-sm py-3">
                  Candidate Response Rating
                </TableColumn>
              )}
            </TableHeader>
            <TableBody>
              {questions.map((item) => (
                <TableRow key={item.key} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50/50">
                  <TableCell className={`${user?.role === 'candidate' ? 'w-full' : 'w-2/3'} py-4 text-gray-800 text-sm md:text-base leading-relaxed`}>
                    <div className="font-semibold text-indigo-650 mb-1">Q{item.key}:</div>
                    <span className="block font-normal break-words whitespace-pre-wrap">{item.question}</span>
                  </TableCell>
                  {user?.role !== 'candidate' && (
                    <TableCell className="w-1/3 py-4">
                      <div className="flex flex-col gap-2 min-w-[200px]">
                        <div className="flex justify-between text-xs text-gray-500 font-medium">
                          <span>Rating Score</span>
                          <span className="font-bold text-indigo-650">{item.rating} / 5</span>
                        </div>
                        <Slider
                          size="md"
                          step={1}
                          showSteps
                          maxValue={5}
                          minValue={1}
                          value={item.rating}
                          isDisabled={endInterview}
                          onChange={(value) => handleRatingChange(item.key, value)}
                          onChangeEnd={() => persistInterviewData(questions)}
                          className="max-w-full"
                          color="secondary"
                        />
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Expert Controls Panel - Visible only during evaluation */}
      {!endInterview && (
        <Card className="p-6 bg-white/80 border border-gray-200 shadow-lg rounded-2xl space-y-6">
          <div className="border-b border-gray-100 pb-3">
            <h3 className="text-lg font-bold text-gray-800">Evaluation Control Center</h3>
            <p className="text-xs text-gray-400">Append manual interview criteria and finalize boardroom panels</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Input Manual Question
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  aria-label="Custom Question"
                  placeholder="Ask something specific about candidates background..."
                  value={customQuestion}
                  onChange={(e) => setCustomQuestion(e.target.value)}
                  variant="bordered"
                  className="flex-1"
                  size="md"
                />
                <Button
                  onClick={addCustomQuestion}
                  color="default"
                  variant="flat"
                  className="font-bold px-6 h-12"
                >
                  ➕ Add Custom Question
                </Button>
              </div>
            </div>
          </div>

          {user?.role === 'expert' && (
            <div className="border-t border-gray-150 pt-4 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Your Verdict Recommendation
                </label>
                <div className="flex flex-wrap gap-3">
                  <Button
                    size="sm"
                    color="success"
                    variant={expertVerdict === "select" ? "solid" : "flat"}
                    onClick={() => setExpertVerdict("select")}
                    className="font-bold px-4 h-10"
                  >
                    ✓ Recommend Select
                  </Button>
                  <Button
                    size="sm"
                    color="danger"
                    variant={expertVerdict === "reject" ? "solid" : "flat"}
                    onClick={() => setExpertVerdict("reject")}
                    className="font-bold px-4 h-10"
                  >
                    ✗ Recommend Reject
                  </Button>
                  <Button
                    size="sm"
                    color="warning"
                    variant={expertVerdict === "hold" ? "solid" : "flat"}
                    onClick={() => setExpertVerdict("hold")}
                    className="font-bold px-4 h-10 text-white bg-amber-500 hover:bg-amber-600"
                  >
                    ⧗ Recommend Hold
                  </Button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Evaluation Feedback Notes / Summary Remarks
                </label>
                <Textarea
                  aria-label="Feedback Notes"
                  placeholder="Provide detailed feedback on candidate's technical skills, communication, and overall fit..."
                  value={expertNotes}
                  onChange={(e) => setExpertNotes(e.target.value)}
                  minRows={3}
                  variant="bordered"
                  className="w-full text-sm font-semibold"
                />
              </div>
            </div>
          )}

          {/* End Interview Action Row */}
          <div className="border-t border-gray-150 pt-6 flex justify-end">
            <Button
              onClick={updateInterviewData}
              isLoading={saving}
              color="danger"
              className="px-8 font-extrabold text-white bg-gradient-to-r from-rose-500 to-red-600 shadow-md shadow-rose-100 h-12 rounded-xl"
            >
              🏁 End & Submit Evaluation
            </Button>
          </div>
        </Card>
      )}


      {/* Aggregate Multi-Expert Evaluation Summary Panel */}
      {user?.role !== 'candidate' && interview.evaluationsBreakdown && interview.evaluationsBreakdown.length > 0 && (
        <Card className="p-6 bg-white border border-gray-150 shadow-md rounded-2xl space-y-4">
          <div className="border-b border-gray-100 pb-3 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-gray-800">
                👥 Interviewer Panel Evaluation Summary
              </h3>
              <p className="text-xs text-gray-400">Aggregated individual scores and submission status from all panel members</p>
            </div>
            <Chip size="sm" color="indigo" variant="flat" className="font-bold">
              {interview.evaluationsCount} / {interview.evaluationsBreakdown.length} Submitted
            </Chip>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {interview.evaluationsBreakdown.map((evalItem, index) => (
              <div key={index} className="p-4 bg-gray-50/50 rounded-xl border border-gray-150 flex flex-col justify-between hover:border-indigo-300 transition duration-200">
                <div className="flex justify-between items-center gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-extrabold text-sm uppercase">
                      {evalItem.expertName.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-800">{evalItem.expertName}</p>
                      <div className="flex gap-2 items-center mt-1">
                        <span className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">ID: {evalItem.expertId.slice(-6)}</span>
                        {evalItem.status === 'completed' && evalItem.verdict && (
                          <Chip
                            size="sm"
                            color={evalItem.verdict === 'select' ? 'success' : (evalItem.verdict === 'reject' ? 'danger' : 'warning')}
                            variant="flat"
                            className="font-bold text-[9px] h-5 px-1 uppercase"
                          >
                            {evalItem.verdict === 'select' ? '✓ Rec Select' : (evalItem.verdict === 'reject' ? '✗ Rec Reject' : '⧗ Rec Potential')}
                          </Chip>
                        )}
                      </div>
                    </div>
                  </div>
                  <Chip
                    size="sm"
                    color={evalItem.status === 'completed' ? 'success' : 'warning'}
                    variant="flat"
                    className="font-bold text-[10px] uppercase"
                  >
                    {evalItem.status === 'completed' ? '✓ Submitted' : 'Evaluating'}
                  </Chip>
                </div>

                {evalItem.status === 'completed' ? (
                  <div className="mt-3 pt-3 border-t border-gray-100 flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-550 font-medium">Evaluation Score:</span>
                      <span className="text-sm font-extrabold text-indigo-650">
                        {evalItem.totalScore} / {evalItem.maxScore}
                      </span>
                    </div>
                    {evalItem.notes && (
                      <div className="bg-white p-2 rounded-lg border border-gray-100 text-xs italic text-gray-600">
                        "{evalItem.notes}"
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400 italic">
                    Interviewer has not finalized their evaluation.
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}


      {/* Completed Summary view */}
      {endInterview && (
        <Card className="p-8 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 shadow-md text-center rounded-2xl">
          <div className="max-w-md mx-auto space-y-4">
            <div className="inline-flex p-3 bg-emerald-100 text-emerald-600 rounded-full">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h4 className="text-xl font-bold text-emerald-800">Evaluation Completed</h4>
            <p className="text-sm text-emerald-700 leading-relaxed">
              {user?.role === 'candidate'
                ? "The evaluation has been completed and locked. Your performance is under review by the HR coordinators."
                : "The candidate interview scores have been processed and locked. No further modifications can be made. The performance report is now available for review by candidate and HR coordinators."}
            </p>
            {user?.role !== 'candidate' && (
              <div className="p-4 bg-white rounded-xl shadow-sm border border-emerald-100 inline-block font-extrabold text-emerald-800 text-lg">
                Final Candidate Score: {totalscore} / {maxScore} ({scorePercent}%)
              </div>
            )}

            {user && user.role === 'hr' && (
              <div className="mt-6 pt-6 border-t border-emerald-250 flex flex-col items-center gap-3">
                <span className="text-xs uppercase tracking-wider text-emerald-700 font-bold">
                  Decide Candidate Outcome (HR Final Verdict)
                </span>
                <div className="flex flex-wrap gap-2 justify-center">
                  <Button
                    size="sm"
                    color="success"
                    variant={status === "selected" ? "solid" : "flat"}
                    onClick={() => handleUpdateStatus("selected")}
                    className="font-bold text-xs"
                  >
                    ✓ Select Candidate
                  </Button>
                  <Button
                    size="sm"
                    color="danger"
                    variant={status === "rejected" ? "solid" : "flat"}
                    onClick={() => handleUpdateStatus("rejected")}
                    className="font-bold text-xs"
                  >
                    ✗ Reject Candidate
                  </Button>
                  <Button
                    size="sm"
                    color="warning"
                    variant={status === "hold" ? "solid" : "flat"}
                    onClick={() => handleUpdateStatus("hold")}
                    className="font-bold text-xs text-white bg-amber-500 hover:bg-amber-600"
                  >
                    ⧗ Put on Hold
                  </Button>
                  <Button
                    size="sm"
                    color="primary"
                    variant={status === "completed" ? "solid" : "flat"}
                    onClick={() => handleUpdateStatus("completed")}
                    className="font-bold text-xs"
                  >
                    Mark as Completed
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
