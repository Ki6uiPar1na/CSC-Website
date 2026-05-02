"use client";

import { useState, useEffect, use } from "react";
import { Plus, Edit2, Trash2, Loader2, Save, X, HelpCircle, Check, Trash, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { useMessage, useLoading } from "@/lib/admin-hooks";
import { Exam, ExamQuestion, Challenge } from "@/lib/admin-types";

export default function AdminExamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [currentExam, setCurrentExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);

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
    fetchExamData();
    fetchChallenges();
  }, [id]);

  const fetchExamData = async () => {
    setFetchLoading(true);
    try {
      const res = await fetch('/api/admin/exams');
      const data = await res.json();
      const found = (data.exams || []).find((e: any) => String(e.id) === String(id));
      if (!found) {
        showMessage('error', 'Exam not found');
        setCurrentExam(null);
        setQuestions([]);
        return;
      }
      setCurrentExam(found);

      // Fetch questions by lessonId (API returns exam with questions when lessonId provided)
      if (found.lesson_id) {
        const qres = await fetch(`/api/admin/exams?lessonId=${found.lesson_id}`);
        const qdata = await qres.json();
        if (qdata.exam) {
          setQuestions(qdata.exam.questions || []);
        } else {
          setQuestions([]);
        }
      } else {
        setQuestions([]);
      }
    } catch (err: any) {
      showMessage('error', err.message || 'Failed to load exam');
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
      console.error('Failed to fetch challenges', err);
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
      const body = editingQuestion ? { questionId: editingQuestion.id, ...questionFormData } : { examId: currentExam.id, ...questionFormData };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error('Failed to save question');
      showMessage('success', 'Question saved');
      setIsQuestionModalOpen(false);
      fetchExamData();
    } catch (err: any) {
      showMessage('error', err.message || 'Failed to save question');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteQuestion = async (questionId: number) => {
    if (!confirm('Delete this question?')) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/exams', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId })
      });
      if (!res.ok) throw new Error('Failed to delete question');
      showMessage('success', 'Question deleted');
      setQuestions(prev => prev.filter(q => q.id !== questionId));
    } catch (err: any) {
      showMessage('error', err.message || 'Failed to delete');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOptionChange = (idx: number, field: 'option_text' | 'is_correct', value: any) => {
    const newOptions = [...questionFormData.options];
    if (field === 'is_correct' && value === true) {
      if (questionFormData.question_type === 'mcq') {
        newOptions.forEach(opt => opt.is_correct = false);
      }
    }

    const finalValue = (field === 'is_correct' && questionFormData.question_type === 'checkbox')
      ? !newOptions[idx].is_correct
      : value;

    newOptions[idx] = { ...newOptions[idx], [field]: finalValue };
    setQuestionFormData({ ...questionFormData, options: newOptions });
  };

  const addOption = () => {
    setQuestionFormData({ ...questionFormData, options: [...questionFormData.options, { option_text: '', is_correct: false }] });
  };

  const removeOption = (idx: number) => {
    setQuestionFormData({ ...questionFormData, options: questionFormData.options.filter((_, i) => i !== idx) });
  };

  if (fetchLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-75">
        <Loader2 className="animate-spin text-primary mb-4" size={48} />
        <p className="text-gray-400 font-mono">Loading exam...</p>
      </div>
    );
  }

  if (!currentExam) return (
    <div className="card text-center py-12">
      <p className="text-gray-400">Exam not found.</p>
      <div className="mt-4">
        <button className="btn" onClick={() => router.push('/admin/exams')}>Back to Exams</button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <AdminPageHeader title={currentExam.title || 'Exam'} icon={<span>📝</span>} actionButton={{ label: 'Add Question', onClick: handleAddQuestion }} message={message} />

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold">{currentExam.title}</h3>
            <p className="text-sm text-gray-400">{currentExam.description}</p>
          </div>
          <div className="text-sm text-gray-500">Total: {(currentExam as any).total_marks ?? '-'} | Pass: {(currentExam as any).pass_marks ?? '-'}</div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-bold text-primary">Questions ({questions.length})</h4>
            <div className="flex gap-2">
              <button className="btn btn-sm" onClick={() => router.push('/admin/exams')}>Back</button>
            </div>
          </div>

          {questions.length === 0 ? (
            <div className="text-center py-12 bg-black/20 rounded-xl border border-dashed border-gray-800">
              <HelpCircle className="mx-auto mb-2 text-gray-700" size={40} />
              <p className="text-gray-500">No questions yet. Add one to get started.</p>
              <div className="mt-4"><button className="btn btn-primary" onClick={handleAddQuestion}>Add Question</button></div>
            </div>
          ) : (
            <div className="space-y-3">
              {questions.map((q: any) => (
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
      </div>

      {/* Question Form Modal */}
      {isQuestionModalOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-60 p-4">
          <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">{editingQuestion ? 'Edit Question' : 'New Question'}</h2>
              <button onClick={() => setIsQuestionModalOpen(false)} className="text-gray-500 hover:text-white"><X size={24} /></button>
            </div>

            <form onSubmit={handleSaveQuestion} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">Question Type</label>
                  <select className="input w-full" value={questionFormData.question_type} onChange={(e) => setQuestionFormData({...questionFormData, question_type: e.target.value as any})}>
                    <option value="mcq">Multiple Choice (MCQ)</option>
                    <option value="checkbox">Multiple Answers (Checkbox)</option>
                    <option value="fitb">Fill in the Blank (FITB)</option>
                    <option value="challenge">CTF Challenge</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">Points</label>
                  <input type="number" className="input w-full" value={questionFormData.points} onChange={(e) => setQuestionFormData({...questionFormData, points: parseInt(e.target.value)})} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">Question Text / Instructions</label>
                <textarea required className="input w-full min-h-25" value={questionFormData.question_text} onChange={(e) => setQuestionFormData({...questionFormData, question_text: e.target.value})} placeholder="Ask your question here..." />
              </div>

              {(questionFormData.question_type === 'mcq' || questionFormData.question_type === 'checkbox') && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-300">Options {questionFormData.question_type === 'checkbox' && "(Select all that are correct)"}</label>
                    <button type="button" onClick={addOption} className="text-xs text-primary hover:underline flex items-center gap-1"><Plus size={12} /> Add Option</button>
                  </div>
                  {questionFormData.options.map((opt: any, idx: number) => (
                    <div key={idx} className="flex gap-2">
                      <div onClick={() => handleOptionChange(idx, 'is_correct', true)} className={`w-10 flex items-center justify-center rounded border cursor-pointer transition-colors ${opt.is_correct ? 'bg-green-500 border-green-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-500'}`} title="Mark as correct">
                        {opt.is_correct ? <Check size={18} /> : idx + 1}
                      </div>
                      <input type="text" required className="input flex-1" value={opt.option_text} onChange={(e) => handleOptionChange(idx, 'option_text', e.target.value)} placeholder={`Option ${idx + 1}`} />
                      <button type="button" onClick={() => removeOption(idx)} disabled={questionFormData.options.length <= 1} className="p-2 text-gray-500 hover:text-error disabled:opacity-30"><Trash size={18} /></button>
                    </div>
                  ))}
                </div>
              )}

              {questionFormData.question_type === 'fitb' && (
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">Correct Answer (Case Insensitive)</label>
                  <input type="text" required className="input w-full" value={questionFormData.options[0]?.option_text || ''} onChange={(e) => setQuestionFormData({ ...questionFormData, options: [{ option_text: e.target.value, is_correct: true }] })} placeholder="Enter the exact correct answer..." />
                  <p className="mt-2 text-xs text-gray-500 italic">User input will be trimmed and compared case-insensitively.</p>
                </div>
              )}

              {questionFormData.question_type === 'challenge' && (
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">Link to Challenge</label>
                  <select required className="input w-full" value={questionFormData.challenge_id || ''} onChange={(e) => setQuestionFormData({...questionFormData, challenge_id: parseInt(e.target.value)})}>
                    <option value="">-- Select a Challenge --</option>
                    {challenges.map(c => (<option key={c.id} value={c.id}>{c.title} ({c.max_points} pts)</option>))}
                  </select>
                  <p className="mt-2 text-xs text-gray-500 italic">The question will be marked correct when the user solves the linked challenge.</p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
                <button type="button" onClick={() => setIsQuestionModalOpen(false)} className="btn btn-secondary px-6">Cancel</button>
                <button type="submit" className="btn btn-primary px-8 flex items-center gap-2" disabled={actionLoading}>{actionLoading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Save Question</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
