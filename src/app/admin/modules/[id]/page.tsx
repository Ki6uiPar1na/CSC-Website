"use client";

import { useState, useEffect, use } from "react";
import { 
  Plus, Edit2, Trash2, ChevronLeft, Loader2, Save, X, 
  Play, FileText, MoveUp, MoveDown, AlertCircle, Trash, CheckCircle2, Link as LinkIcon,
  HelpCircle, Check, Info
} from "lucide-react";
import { useRouter } from "next/navigation";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { useMessage, useLoading } from "@/lib/admin-hooks";
import { Module, Lesson, Exam, ExamQuestion, Challenge } from "@/lib/admin-types";
import { formatDate } from "@/lib/admin-utils";
import { compressImage } from "@/lib/image-utils";

export default function AdminModuleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  
  const [module, setModule] = useState<Module | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  
  const [showLessonForm, setShowLessonForm] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [lessonFormData, setLessonFormData] = useState({
    title: "",
    content: "",
    github_url: "",
    video_url: "",
    image_url: "",
    order_index: 0
  });
  const [isCompressing, setIsCompressing] = useState(false);

  // Exam Management State
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [selectedLessonForExam, setSelectedLessonForExam] = useState<Lesson | null>(null);
  const [currentExam, setCurrentExam] = useState<Exam | null>(null);
  const [examQuestions, setExamQuestions] = useState<any[]>([]);
  
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<any | null>(null);
  const [questionFormData, setQuestionFormData] = useState({
    question_type: 'mcq' as 'mcq' | 'checkbox' | 'fitb' | 'challenge',
    question_text: '',
    points: 10,
    challenge_id: null as number | null,
    options: [
      { option_text: '', is_correct: true },
      { option_text: '', is_correct: false }
    ]
  });

  const { loading: fetchLoading, setLoading: setFetchLoading } = useLoading(true);
  const { loading: actionLoading, setLoading: setActionLoading } = useLoading();
  const { message, showMessage } = useMessage();

  useEffect(() => {
    fetchModuleData();
    fetchChallenges();
  }, [id]);

  const fetchModuleData = async () => {
    setFetchLoading(true);
    try {
      // Fetch module
      const modRes = await fetch(`/api/admin/modules`);
      const modData = await modRes.json();
      const currentMod = modData.modules.find((m: Module) => m.id === parseInt(id));
      if (!currentMod) throw new Error("Module not found");
      setModule(currentMod);

      // Fetch lessons
      const lessonRes = await fetch(`/api/admin/lessons?moduleId=${id}`);
      const lessonData = await lessonRes.json();
      const fetchedLessons = lessonData.lessons || [];
      setLessons(fetchedLessons);

      // Fetch exams for these lessons
      const examPromises = fetchedLessons.map((l: Lesson) => 
        fetch(`/api/admin/exams?lessonId=${l.lesson_id}`).then(res => res.json())
      );
      const examResults = await Promise.all(examPromises);
      const fetchedExams = examResults.map(r => r.exam).filter(Boolean);
      setExams(fetchedExams);
    } catch (error: any) {
      showMessage("error", error.message);
    } finally {
      setFetchLoading(false);
    }
  };

  const fetchChallenges = async () => {
    try {
      const res = await fetch('/api/admin/challenges');
      const data = await res.json();
      setChallenges(data.challenges || []);
    } catch (err) {
      console.error("Failed to fetch challenges:", err);
    }
  };

  const handleLessonSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);

    try {
      const url = "/api/admin/lessons";
      const method = editingLesson ? "PUT" : "POST";
      const body = editingLesson 
        ? { ...lessonFormData, lessonId: editingLesson.lesson_id, moduleId: parseInt(id) }
        : { ...lessonFormData, moduleId: parseInt(id) };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Failed to save lesson");
      showMessage("success", editingLesson ? "Lesson updated" : "Lesson created");
      setShowLessonForm(false);
      setEditingLesson(null);
      fetchModuleData();
    } catch (error: any) {
      showMessage("error", error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsCompressing(true);
      const base64 = await compressImage(file, 1.5, 1.0);
      setLessonFormData({ ...lessonFormData, image_url: base64 });
    } catch (error: any) {
      alert(error.message || "Error compressing image");
    } finally {
      setIsCompressing(false);
    }
  };

  const handleEditLesson = (lesson: Lesson) => {
    setEditingLesson(lesson);
    setLessonFormData({
      title: lesson.title,
      content: lesson.content,
      github_url: lesson.github_url || "",
      video_url: lesson.video_url || "",
      image_url: lesson.image_url || "",
      order_index: lesson.order_index
    });
    setShowLessonForm(true);
  };

  const handleDeleteLesson = async (lessonId: number) => {
    if (!confirm("Are you sure you want to delete this lesson?")) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/lessons", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId }),
      });
      if (!res.ok) throw new Error("Failed to delete lesson");
      showMessage("success", "Lesson deleted");
      fetchModuleData();
    } catch (error: any) {
      showMessage("error", error.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Exam / Practice Problem Management
  const handleManageExam = async (lesson: Lesson) => {
    setSelectedLessonForExam(lesson);
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/exams?lessonId=${lesson.lesson_id}`);
      const data = await res.json();
      if (data.exam) {
        setCurrentExam(data.exam);
        setExamQuestions(data.exam.questions || []);
      } else {
        // Create a default exam record if none exists
        const createRes = await fetch('/api/admin/exams', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lessonId: lesson.lesson_id,
            title: `Practice: ${lesson.title}`,
            description: `Complete these problems to finish the lesson.`
          })
        });
        const createData = await createRes.json();
        if (createData.success) {
          setCurrentExam({
            id: createData.examId,
            lesson_id: lesson.lesson_id,
            title: `Practice: ${lesson.title}`,
            description: `Complete these problems to finish the lesson.`,
            created_at: new Date().toISOString()
          });
          setExamQuestions([]);
        }
      }
      setIsExamModalOpen(true);
    } catch (error: any) {
      showMessage("error", "Failed to load practice problems");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddQuestion = () => {
    setEditingQuestion(null);
    setQuestionFormData({
      question_type: 'mcq',
      question_text: '',
      points: 10,
      challenge_id: null,
      options: [
        { option_text: '', is_correct: true },
        { option_text: '', is_correct: false }
      ]
    });
    setIsQuestionModalOpen(true);
  };

  const handleEditQuestion = (question: any) => {
    setEditingQuestion(question);
    setQuestionFormData({
      question_type: question.question_type,
      question_text: question.question_text,
      points: question.points,
      challenge_id: question.challenge_id,
      options: question.options || []
    });
    setIsQuestionModalOpen(true);
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentExam) return;
    setActionLoading(true);

    try {
      const url = '/api/admin/exams';
      const method = editingQuestion ? 'PUT' : 'POST';
      const body = {
        examId: currentExam.id,
        questionId: editingQuestion?.id,
        ...questionFormData
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!res.ok) throw new Error("Failed to save question");
      showMessage("success", "Question saved");
      setIsQuestionModalOpen(false);
      
      // Refresh exam data
      const refreshRes = await fetch(`/api/admin/exams?lessonId=${selectedLessonForExam?.lesson_id}`);
      const refreshData = await refreshRes.json();
      if (refreshData.exam) {
        setExamQuestions(refreshData.exam.questions || []);
      }
    } catch (error: any) {
      showMessage("error", error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteQuestion = async (questionId: number) => {
    if (!confirm("Delete this question?")) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/exams', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId })
      });
      if (!res.ok) throw new Error("Failed to delete question");
      setExamQuestions(prev => prev.filter(q => q.id !== questionId));
      showMessage("success", "Question deleted");
    } catch (error: any) {
      showMessage("error", error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleOptionChange = (idx: number, field: 'option_text' | 'is_correct', value: any) => {
    const newOptions = [...questionFormData.options];
    if (field === 'is_correct' && value === true) {
      if (questionFormData.question_type === 'mcq') {
        // Single correct answer for MCQ
        newOptions.forEach(opt => opt.is_correct = false);
      }
      // For 'checkbox', we don't clear others
    }
    
    // Toggle logic for checkbox is_correct
    const finalValue = (field === 'is_correct' && questionFormData.question_type === 'checkbox') 
      ? !newOptions[idx].is_correct 
      : value;

    newOptions[idx] = { ...newOptions[idx], [field]: finalValue };
    setQuestionFormData({ ...questionFormData, options: newOptions });
  };

  const addOption = () => {
    setQuestionFormData({
      ...questionFormData,
      options: [...questionFormData.options, { option_text: '', is_correct: false }]
    });
  };

  const removeOption = (idx: number) => {
    setQuestionFormData({
      ...questionFormData,
      options: questionFormData.options.filter((_, i) => i !== idx)
    });
  };

  if (fetchLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-primary mb-4" size={48} />
        <p className="text-gray-400 font-mono">RETRIEVING MODULE DATA...</p>
      </div>
    );
  }

  if (!module) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <AdminPageHeader 
          title={module.title}
          icon={<span>📚</span>}
          actionButton={{
            label: "Add Lesson",
            onClick: () => {
              setEditingLesson(null);
              setLessonFormData({ title: "", content: "", github_url: "", video_url: "", image_url: "", order_index: lessons.length });
              setShowLessonForm(true);
            },
          }}
          message={message}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Module Info */}
        <div className="lg:col-span-1 space-y-6">
          <div className="card">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Info size={20} className="text-primary" /> Module Details
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 uppercase font-mono">Description</label>
                <p className="text-gray-300">{module.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 uppercase font-mono">Lessons</label>
                  <p className="text-xl font-bold text-white">{lessons.length}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase font-mono">Bonus Points</label>
                  <p className="text-xl font-bold text-primary">{module.completion_bonus_points} pts</p>
                </div>
              </div>
              <div className="pt-4 border-t border-gray-800 flex justify-between items-center">
                <span className={`px-2 py-1 rounded text-xs font-bold ${module.is_premium ? 'bg-primary/10 text-primary' : 'bg-gray-800 text-gray-400'}`}>
                  {module.is_premium ? "PREMIUM" : "FREE"}
                </span>
                <span className="text-xs text-gray-500">Created {formatDate(module.created_at)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Lessons List */}
        <div className="lg:col-span-2">
          <div className="card">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-primary">
              <Play size={20} /> Curriculum Lessons
            </h2>

            {lessons.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-gray-800 rounded-xl">
                <Play className="mx-auto mb-4 text-gray-600" size={48} />
                <p className="text-gray-500">No lessons created yet for this module.</p>
                <button 
                  onClick={() => setShowLessonForm(true)}
                  className="btn btn-primary mt-4 btn-sm"
                >
                  Create First Lesson
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {lessons.map((lesson, idx) => {
                  const hasExam = exams.find(e => e.lesson_id === lesson.lesson_id);
                  return (
                    <div key={lesson.lesson_id} className="flex items-center gap-4 p-4 bg-black/40 border border-border-color rounded-xl hover:border-primary/30 transition-all group">
                      <div className="w-8 h-8 rounded bg-gray-900 flex items-center justify-center font-bold font-mono text-primary border border-primary/20">
                        {lesson.order_index + 1}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-white group-hover:text-primary transition-colors">{lesson.title}</h3>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                          {lesson.github_url && <span className="flex items-center gap-1 text-primary"><LinkIcon size={10} /> GitHub</span>}
                          {lesson.video_url && <span className="flex items-center gap-1"><Play size={10} /> Video</span>}
                          <span className="flex items-center gap-1"><FileText size={10} /> {lesson.github_url ? "Dynamic" : `${lesson.content.length} chars`}</span>
                          {hasExam && <span className="flex items-center gap-1 text-yellow-500/70"><CheckCircle2 size={10} /> Practice Problems</span>}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleManageExam(lesson)}
                          className={`p-2 transition-colors flex items-center gap-1 text-xs font-bold uppercase rounded ${hasExam ? 'text-yellow-500 hover:text-yellow-400 bg-yellow-500/10' : 'text-gray-500 hover:text-primary bg-gray-800'}`}
                          title="Manage Practice Problems"
                        >
                          <HelpCircle size={16} /> {hasExam ? "Problems" : "Add Problems"}
                        </button>
                        <button 
                          onClick={() => handleEditLesson(lesson)}
                          className="p-2 text-gray-400 hover:text-primary transition-colors bg-gray-800 rounded"
                          title="Edit lesson"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => handleDeleteLesson(lesson.lesson_id)}
                          className="p-2 text-gray-400 hover:text-error transition-colors bg-gray-800 rounded"
                          title="Delete lesson"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lesson Form Modal */}
      {showLessonForm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">
                {editingLesson ? "Edit Lesson" : "Create New Lesson"}
              </h2>
              <button onClick={() => setShowLessonForm(false)} className="text-gray-500 hover:text-white">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleLessonSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">Lesson Title *</label>
                  <input
                    type="text"
                    required
                    value={lessonFormData.title}
                    onChange={(e) => setLessonFormData({ ...lessonFormData, title: e.target.value })}
                    className="input w-full"
                    placeholder="e.g., Introduction to Buffer Overflow"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">Order Index</label>
                  <input
                    type="number"
                    value={lessonFormData.order_index}
                    onChange={(e) => setLessonFormData({ ...lessonFormData, order_index: parseInt(e.target.value) })}
                    className="input w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">YouTube Video URL</label>
                  <input
                    type="url"
                    value={lessonFormData.video_url}
                    onChange={(e) => setLessonFormData({ ...lessonFormData, video_url: e.target.value })}
                    className="input w-full"
                    placeholder="https://www.youtube.com/watch?v=..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">GitHub Markdown URL (Optional)</label>
                  <input
                    type="url"
                    value={lessonFormData.github_url}
                    onChange={(e) => setLessonFormData({ ...lessonFormData, github_url: e.target.value })}
                    className="input w-full"
                    placeholder="https://github.com/user/repo/blob/main/lesson.md"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium mb-2 text-gray-300">Lesson Image (Max 1.5MB)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full p-3 border border-gray-600 rounded-lg bg-gray-700 text-white"
                />
                {isCompressing && <p className="text-blue-400 text-sm">Compressing image...</p>}
                {lessonFormData.image_url && !isCompressing && (
                  <div className="mt-2 flex items-center gap-4">
                    <img src={lessonFormData.image_url} alt="Preview" className="h-20 w-20 object-cover rounded border border-gray-600" />
                    <p className="text-green-400 text-xs">Image ready (Base64)</p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">
                  {lessonFormData.github_url ? "Local Content (Fallback / Metadata)" : "Content (Markdown Supported) *"}
                </label>
                <textarea
                  required={!lessonFormData.github_url}
                  value={lessonFormData.content}
                  onChange={(e) => setLessonFormData({ ...lessonFormData, content: e.target.value })}
                  className="input w-full min-h-[300px] font-mono text-sm"
                  placeholder="# Lesson Content\n\nUse markdown to format your lesson content..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setShowLessonForm(false)}
                  className="btn btn-secondary px-6"
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary px-8 flex items-center gap-2"
                  disabled={actionLoading}
                >
                  {actionLoading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                  {editingLesson ? "Update Lesson" : "Create Lesson"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Practice Problems Modal */}
      {isExamModalOpen && selectedLessonForExam && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white">Practice Problems</h2>
                <p className="text-gray-400 text-sm">Lesson: {selectedLessonForExam.title}</p>
              </div>
              <button onClick={() => setIsExamModalOpen(false)} className="text-gray-500 hover:text-white">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto mb-6 pr-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-primary">Questions ({examQuestions.length})</h3>
                <button 
                  onClick={handleAddQuestion}
                  className="btn btn-primary btn-sm flex items-center gap-1"
                >
                  <Plus size={14} /> Add Question
                </button>
              </div>

              {examQuestions.length === 0 ? (
                <div className="text-center py-12 bg-black/20 rounded-xl border border-dashed border-gray-800">
                  <HelpCircle className="mx-auto mb-2 text-gray-700" size={40} />
                  <p className="text-gray-500">No practice problems added yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {examQuestions.map((q, idx) => (
                    <div key={q.id} className="p-4 bg-gray-900/50 border border-gray-800 rounded-lg group">
                      <div className="flex justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-mono bg-gray-800 px-2 py-0.5 rounded text-gray-400 uppercase">{q.question_type}</span>
                            <span className="text-xs font-mono bg-primary/10 px-2 py-0.5 rounded text-primary">{q.points} pts</span>
                          </div>
                          <p className="text-white font-medium">{q.question_text}</p>
                          {q.question_type === 'mcq' && q.options && (
                            <div className="mt-2 grid grid-cols-2 gap-2">
                              {q.options.map((opt: any) => (
                                <div key={opt.id} className={`text-xs p-1.5 rounded border ${opt.is_correct ? 'bg-green-500/10 border-green-500/30 text-green-500' : 'bg-black/20 border-gray-800 text-gray-500'}`}>
                                  {opt.option_text}
                                </div>
                              ))}
                            </div>
                          )}
                          {q.question_type === 'challenge' && (
                            <div className="mt-2 text-xs text-yellow-500/70 italic flex items-center gap-1">
                              <AlertCircle size={12} /> Linked to Challenge ID: {q.challenge_id}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-2">
                          <button onClick={() => handleEditQuestion(q)} className="p-1.5 text-gray-500 hover:text-primary"><Edit2 size={16} /></button>
                          <button onClick={() => handleDeleteQuestion(q.id)} className="p-1.5 text-gray-500 hover:text-error"><Trash2 size={16} /></button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-gray-800 flex justify-end">
              <button onClick={() => setIsExamModalOpen(false)} className="btn btn-secondary px-8">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Question Form Modal */}
      {isQuestionModalOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[60] p-4">
          <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">
                {editingQuestion ? "Edit Question" : "New Question"}
              </h2>
              <button onClick={() => setIsQuestionModalOpen(false)} className="text-gray-500 hover:text-white">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSaveQuestion} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">Question Type</label>
                  <select 
                    className="input w-full"
                    value={questionFormData.question_type}
                    onChange={(e) => setQuestionFormData({...questionFormData, question_type: e.target.value as any})}
                  >
                    <option value="mcq">Multiple Choice (MCQ)</option>
                    <option value="checkbox">Multiple Answers (Checkbox)</option>
                    <option value="fitb">Fill in the Blank (FITB)</option>
                    <option value="challenge">CTF Challenge</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">Points</label>
                  <input 
                    type="number" 
                    className="input w-full"
                    value={questionFormData.points}
                    onChange={(e) => setQuestionFormData({...questionFormData, points: parseInt(e.target.value)})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">Question Text / Instructions</label>
                <textarea 
                  required
                  className="input w-full min-h-[100px]"
                  value={questionFormData.question_text}
                  onChange={(e) => setQuestionFormData({...questionFormData, question_text: e.target.value})}
                  placeholder="Ask your question here..."
                />
              </div>

              {(questionFormData.question_type === 'mcq' || questionFormData.question_type === 'checkbox') && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-300">
                      Options {questionFormData.question_type === 'checkbox' && "(Select all that are correct)"}
                    </label>
                    <button type="button" onClick={addOption} className="text-xs text-primary hover:underline flex items-center gap-1">
                      <Plus size={12} /> Add Option
                    </button>
                  </div>
                  {questionFormData.options.map((opt, idx) => (
                    <div key={idx} className="flex gap-2">
                      <div 
                        onClick={() => handleOptionChange(idx, 'is_correct', true)}
                        className={`w-10 flex items-center justify-center rounded border cursor-pointer transition-colors ${opt.is_correct ? 'bg-green-500 border-green-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-500'}`}
                        title="Mark as correct"
                      >
                        {opt.is_correct ? <Check size={18} /> : idx + 1}
                      </div>
                      <input 
                        type="text" 
                        required
                        className="input flex-1"
                        value={opt.option_text}
                        onChange={(e) => handleOptionChange(idx, 'option_text', e.target.value)}
                        placeholder={`Option ${idx + 1}`}
                      />
                      <button 
                        type="button" 
                        onClick={() => removeOption(idx)}
                        disabled={questionFormData.options.length <= 1}
                        className="p-2 text-gray-500 hover:text-error disabled:opacity-30"
                      >
                        <Trash size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {questionFormData.question_type === 'fitb' && (
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">Correct Answer (Case Insensitive)</label>
                  <input 
                    type="text" 
                    required
                    className="input w-full"
                    value={questionFormData.options[0]?.option_text || ''}
                    onChange={(e) => setQuestionFormData({
                      ...questionFormData, 
                      options: [{ option_text: e.target.value, is_correct: true }]
                    })}
                    placeholder="Enter the exact correct answer..."
                  />
                  <p className="mt-2 text-xs text-gray-500 italic">User input will be trimmed and compared case-insensitively.</p>
                </div>
              )}

              {questionFormData.question_type === 'challenge' && (
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">Link to Challenge</label>
                  <select 
                    required
                    className="input w-full"
                    value={questionFormData.challenge_id || ''}
                    onChange={(e) => setQuestionFormData({...questionFormData, challenge_id: parseInt(e.target.value)})}
                  >
                    <option value="">-- Select a Challenge --</option>
                    {challenges.map(c => (
                      <option key={c.id} value={c.id}>{c.title} ({c.max_points} pts)</option>
                    ))}
                  </select>
                  <p className="mt-2 text-xs text-gray-500 italic">The question will be marked correct when the user solves the linked challenge.</p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsQuestionModalOpen(false)}
                  className="btn btn-secondary px-6"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary px-8 flex items-center gap-2"
                  disabled={actionLoading}
                >
                  {actionLoading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                  Save Question
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
