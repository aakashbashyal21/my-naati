import React, { useState, useEffect } from 'react';
import { AudioDialog, AudioChunk } from '../../../types/audio';
import { getAudioDialogs, createAudioDialog, updateAudioDialog, deleteAudioDialog, getAudioChunks, createAudioChunk, updateAudioChunk, deleteAudioChunk, uploadAudioFile } from '../../../lib/database';
import { Plus, Trash2, Edit, Upload, Play, Pause, ArrowUp, ArrowDown, AudioLines, User, BookOpen, ChevronDown, ChevronRight } from 'lucide-react';

const AudioDialogManagement: React.FC = () => {
  const [dialogs, setDialogs] = useState<AudioDialog[]>([]);
  const [selectedDialog, setSelectedDialog] = useState<AudioDialog | null>(null);
  const [chunks, setChunks] = useState<AudioChunk[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDialogModal, setShowDialogModal] = useState(false);
  const [dialogForm, setDialogForm] = useState<Partial<AudioDialog>>({ title: '', language_pair: 'en-np' });
  const [editingDialogId, setEditingDialogId] = useState<string | null>(null);
  const [showChunkModal, setShowChunkModal] = useState(false);
  const [chunkForm, setChunkForm] = useState<{ speaker: 'en' | 'np'; file: File | null }>({ speaker: 'en', file: null });
  const [uploading, setUploading] = useState(false);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [expandedDialogs, setExpandedDialogs] = useState<Set<string>>(new Set());

  // Load dialogs
  useEffect(() => {
    loadDialogs();
  }, []);

  const loadDialogs = async () => {
    setLoading(true);
    try {
      const data = await getAudioDialogs();
      setDialogs(data);
    } catch (err) {
      setError('Failed to load dialogs');
    } finally {
      setLoading(false);
    }
  };

  // Load chunks for selected dialog
  useEffect(() => {
    if (selectedDialog) {
      loadChunks(selectedDialog.id);
    } else {
      setChunks([]);
    }
  }, [selectedDialog]);

  const loadChunks = async (dialogId: string) => {
    setLoading(true);
    try {
      const data = await getAudioChunks(dialogId);
      setChunks(data);
    } catch (err) {
      setError('Failed to load audio chunks');
    } finally {
      setLoading(false);
    }
  };

  // Dialog CRUD
  const handleDialogFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setDialogForm({ ...dialogForm, [e.target.name]: e.target.value });
  };

  const handleCreateOrUpdateDialog = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingDialogId) {
        await updateAudioDialog(editingDialogId, dialogForm);
      } else {
        await createAudioDialog(dialogForm);
      }
      setShowDialogModal(false);
      setDialogForm({ title: '', language_pair: 'en-np' });
      setEditingDialogId(null);
      loadDialogs();
    } catch (err) {
      setError('Failed to save dialog');
    } finally {
      setLoading(false);
    }
  };

  const handleEditDialog = (dialog: AudioDialog) => {
    setDialogForm(dialog);
    setEditingDialogId(dialog.id);
    setShowDialogModal(true);
  };

  const handleDeleteDialog = async (id: string) => {
    if (!window.confirm('Delete this dialog and all its audio chunks?')) return;
    setLoading(true);
    try {
      await deleteAudioDialog(id);
      if (selectedDialog?.id === id) setSelectedDialog(null);
      loadDialogs();
    } catch (err) {
      setError('Failed to delete dialog');
    } finally {
      setLoading(false);
    }
  };

  // Chunk CRUD
  const handleChunkFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setChunkForm({ ...chunkForm, [e.target.name]: e.target.value });
  };

  const handleChunkFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setChunkForm({ ...chunkForm, file: e.target.files[0] });
    }
  };

  const handleUploadChunk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDialog || !chunkForm.file) return;
    setUploading(true);
    try {
      const chunkOrder = chunks.length + 1;
      const audioUrl = await uploadAudioFile(chunkForm.file, selectedDialog.id, chunkOrder);
      await createAudioChunk({
        dialog_id: selectedDialog.id,
        chunk_order: chunkOrder,
        speaker: chunkForm.speaker,
        audio_url: audioUrl,
      });
      setShowChunkModal(false);
      setChunkForm({ speaker: 'en', file: null });
      loadChunks(selectedDialog.id);
    } catch (err) {
      setError('Failed to upload audio chunk');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteChunk = async (id: string) => {
    if (!selectedDialog) return;
    if (!window.confirm('Delete this audio chunk?')) return;
    setLoading(true);
    try {
      await deleteAudioChunk(id);
      loadChunks(selectedDialog.id);
    } catch (err) {
      setError('Failed to delete chunk');
    } finally {
      setLoading(false);
    }
  };

  // Reorder chunks (move up/down)
  const moveChunk = async (index: number, direction: 'up' | 'down') => {
    if (!selectedDialog) return;
    const newChunks: AudioChunk[] = [...chunks];
    if (direction === 'up' && index > 0) {
      [newChunks[index - 1], newChunks[index]] = [newChunks[index], newChunks[index - 1]];
    } else if (direction === 'down' && index < newChunks.length - 1) {
      [newChunks[index], newChunks[index + 1]] = [newChunks[index + 1], newChunks[index]];
    } else {
      return;
    }
    // Update chunk_order in DB
    setLoading(true);
    try {
      for (let i = 0; i < newChunks.length; i++) {
        const chunk = newChunks[i];
        if (chunk) {
          await updateAudioChunk(chunk.id, { chunk_order: i + 1 });
        }
      }
      loadChunks(selectedDialog.id);
    } catch (err) {
      setError('Failed to reorder chunks');
    } finally {
      setLoading(false);
    }
  };

  // Audio preview
  const handlePlayPreview = (url: string, index: number) => {
    setAudioPreviewUrl(url);
    setPlayingIndex(index);
  };
  const handlePausePreview = () => {
    setAudioPreviewUrl(null);
    setPlayingIndex(null);
  };

  // Toggle dialog expansion
  const toggleDialogExpansion = async (dialog: AudioDialog) => {
    const newExpanded = new Set(expandedDialogs);
    if (newExpanded.has(dialog.id)) {
      newExpanded.delete(dialog.id);
    } else {
      newExpanded.add(dialog.id);
      // Load chunks if not already loaded
      if (!chunks.length || selectedDialog?.id !== dialog.id) {
        await loadChunks(dialog.id);
      }
    }
    setExpandedDialogs(newExpanded);
    setSelectedDialog(dialog);
  };

  // Load chunks for a specific dialog
  const loadChunksForDialog = async (dialogId: string) => {
    setLoading(true);
    try {
      const data = await getAudioChunks(dialogId);
      setChunks(data);
    } catch (err) {
      setError('Failed to load audio chunks');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <AudioLines className="h-6 w-6 text-blue-600" /> Audio Dialogs
        </h2>
        <button
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          onClick={() => { setShowDialogModal(true); setDialogForm({ title: '', language_pair: 'en-np' }); setEditingDialogId(null); }}
        >
          <Plus className="h-4 w-4" /> New Dialog
        </button>
      </div>

      {/* Dialog List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-8">
        <table className="w-full text-left">
          <thead>
            <tr className="text-gray-600 text-sm">
              <th className="py-2">Title</th>
              <th className="py-2">Language Pair</th>
              <th className="py-2"># Chunks</th>
              <th className="py-2">Created</th>
              <th className="py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {dialogs.map((dialog) => (
              <React.Fragment key={dialog.id}>
                <tr className={selectedDialog?.id === dialog.id ? 'bg-blue-50' : ''}>
                  <td className="py-2 font-medium cursor-pointer flex items-center gap-2" onClick={() => toggleDialogExpansion(dialog)}>
                    {expandedDialogs.has(dialog.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    {dialog.title}
                  </td>
                  <td className="py-2">{dialog.language_pair}</td>
                  <td className="py-2">{dialog.id === selectedDialog?.id ? chunks.length : '-'}</td>
                  <td className="py-2">{new Date(dialog.created_at).toLocaleDateString()}</td>
                  <td className="py-2 flex gap-2">
                    <button className="p-1 text-blue-600 hover:bg-blue-50 rounded" onClick={() => handleEditDialog(dialog)}><Edit className="h-4 w-4" /></button>
                    <button className="p-1 text-red-600 hover:bg-red-50 rounded" onClick={() => handleDeleteDialog(dialog.id)}><Trash2 className="h-4 w-4" /></button>
                  </td>
                </tr>
                {expandedDialogs.has(dialog.id) && (
                  <tr>
                    <td colSpan={5} className="p-4 bg-gray-50">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-purple-600" /> Audio Chunks
                        </h4>
                        <button
                          className="flex items-center gap-2 px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700"
                          onClick={() => setShowChunkModal(true)}
                        >
                          <Upload className="h-4 w-4" /> Upload Chunk
                        </button>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="text-gray-600 text-sm">
                              <th className="py-2">Order</th>
                              <th className="py-2">Speaker</th>
                              <th className="py-2">Audio</th>
                              <th className="py-2">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {chunks.map((chunk: AudioChunk, idx: number) => (
                              <tr key={chunk.id}>
                                <td className="py-2">{chunk.chunk_order}</td>
                                <td className="py-2 flex items-center gap-1">
                                  {chunk.speaker === 'en' ? <User className="h-4 w-4 text-blue-600" /> : <User className="h-4 w-4 text-green-600" />}
                                  {chunk.speaker === 'en' ? 'English' : 'Nepali'}
                                </td>
                                <td className="py-2">
                                  <audio src={chunk.audio_url} controls className="w-80 max-w-xs rounded-lg border border-gray-200 shadow-sm my-2" />
                                </td>
                                <td className="py-2 flex gap-2">
                                  <button className="p-1 text-gray-600 hover:bg-gray-100 rounded" onClick={() => moveChunk(idx, 'up')} disabled={idx === 0}><ArrowUp className="h-4 w-4" /></button>
                                  <button className="p-1 text-gray-600 hover:bg-gray-100 rounded" onClick={() => moveChunk(idx, 'down')} disabled={idx === chunks.length - 1}><ArrowDown className="h-4 w-4" /></button>
                                  <button className="p-1 text-red-600 hover:bg-red-50 rounded" onClick={() => handleDeleteChunk(chunk.id)}><Trash2 className="h-4 w-4" /></button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Dialog Modal */}
      {showDialogModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">{editingDialogId ? 'Edit Dialog' : 'New Dialog'}</h3>
            <form onSubmit={handleCreateOrUpdateDialog} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input name="title" value={dialogForm.title || ''} onChange={handleDialogFormChange} className="w-full border rounded px-3 py-2" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Language Pair</label>
                <select name="language_pair" value={dialogForm.language_pair || 'en-np'} onChange={handleDialogFormChange} className="w-full border rounded px-3 py-2">
                  <option value="en-np">English - Nepali</option>
                  <option value="np-en">Nepali - English</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea name="description" value={dialogForm.description || ''} onChange={handleDialogFormChange} className="w-full border rounded px-3 py-2" />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" className="px-4 py-2 bg-gray-200 rounded" onClick={() => setShowDialogModal(false)}>Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">{editingDialogId ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Chunk Modal */}
      {showChunkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Upload Audio Chunk</h3>
            <form onSubmit={handleUploadChunk} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Speaker</label>
                <select name="speaker" value={chunkForm.speaker} onChange={handleChunkFormChange} className="w-full border rounded px-3 py-2">
                  <option value="en">English Speaker</option>
                  <option value="np">Nepali Speaker</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Audio File</label>
                <input type="file" accept="audio/*" onChange={handleChunkFileChange} className="w-full" required />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" className="px-4 py-2 bg-gray-200 rounded" onClick={() => setShowChunkModal(false)}>Cancel</button>
                <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded" disabled={uploading}>{uploading ? 'Uploading...' : 'Upload'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded shadow-lg z-50">
          {error}
          <button className="ml-4" onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}
    </div>
  );
};

export default AudioDialogManagement; 