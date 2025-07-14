import React, { useState, useEffect, useRef } from 'react';
import { AudioDialog, AudioChunk } from '../../../types/audio';
import { getAudioDialogs, getAudioChunks, getUserPreferredLanguage } from '../../../lib/database';
import { Play, Pause, SkipForward, SkipBack, Volume2, User, Clock, BookOpen, Mic, Square, RotateCcw } from 'lucide-react';

interface AudioPracticeProps {
  userId: string;
}

interface UserRecording {
  chunkId: string;
  audioBlob: Blob;
  audioUrl: string;
  timestamp: Date;
}

const AudioPractice: React.FC<AudioPracticeProps> = ({ userId }) => {
  const [dialogs, setDialogs] = useState<AudioDialog[]>([]);
  const [selectedDialog, setSelectedDialog] = useState<AudioDialog | null>(null);
  const [chunks, setChunks] = useState<AudioChunk[]>([]);
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [practiceMode, setPracticeMode] = useState<'sequential' | 'random'>('sequential');
  const [showTranscript, setShowTranscript] = useState(false);
  const [userPreferredLanguage, setUserPreferredLanguage] = useState<string | null>(null);
  
  // Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTimer, setRecordingTimer] = useState(0);
  const [countdownTimer, setCountdownTimer] = useState(0);
  const [showCountdown, setShowCountdown] = useState(false);
  const [userRecordings, setUserRecordings] = useState<UserRecording[]>([]);
  const [isPlaybackMode, setIsPlaybackMode] = useState(false);
  const [playbackIndex, setPlaybackIndex] = useState(0);
  const [showDialogModal, setShowDialogModal] = useState(false);
  const [dialogInitialized, setDialogInitialized] = useState(false);
  const [shouldAutoPlayNext, setShouldAutoPlayNext] = useState(false);
  
  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const playbackAudioRef = useRef<HTMLAudioElement | null>(null);

  // Load user's preferred language and available dialogs
  useEffect(() => {
    loadUserPreferencesAndDialogs();
  }, []);

  const loadUserPreferencesAndDialogs = async () => {
    setLoading(true);
    try {
      // Test database connection first
      console.log('Testing database connection...');
      
      // Get user's preferred language
      const preferredLanguage = await getUserPreferredLanguage(userId);
      console.log('User preferred language:', preferredLanguage);
      setUserPreferredLanguage(preferredLanguage);
      
      // Get all dialogs
      console.log('Fetching dialogs...');
      const allDialogs = await getAudioDialogs();
      console.log('All dialogs loaded:', allDialogs);
      console.log('Number of dialogs:', allDialogs.length);
      
      // For now, show all dialogs since language_pair doesn't match language_id
      // TODO: Implement proper language filtering when language system is updated
      setDialogs(allDialogs);
    } catch (err) {
      console.error('Error loading dialogs:', err);
      setError(`Failed to load dialogs: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Load chunks for selected dialog
  useEffect(() => {
    if (selectedDialog) {
      loadChunks(selectedDialog.id);
    }
  }, [selectedDialog]);

  // Auto-play first chunk when chunks are loaded
  useEffect(() => {
    console.log('Initialization effect triggered:', {
      chunksLength: chunks.length,
      selectedDialog: !!selectedDialog,
      isPlaybackMode,
      dialogInitialized
    });
    
    if (chunks.length > 0 && selectedDialog && !isPlaybackMode && !dialogInitialized) {
      console.log('Initializing dialog and setting up auto-play for first chunk');
      setCurrentChunkIndex(0);
      setDialogInitialized(true);
      setTimeout(() => {
        setShouldAutoPlayNext(true); // Only trigger via flag
      }, 100);
    }
  }, [chunks, selectedDialog, dialogInitialized]);

  // Play chunk when index changes during practice (after initialization)
  useEffect(() => {
    if (
      shouldAutoPlayNext &&
      chunks.length > 0 &&
      currentChunkIndex < chunks.length &&
      !isPlaybackMode &&
      !isRecording
    ) {
      console.log('Auto-playing chunk:', currentChunkIndex);
      setShouldAutoPlayNext(false); // Always reset
      playCurrentChunk(); // ⬅ Clean and safe
    }
  }, [currentChunkIndex, shouldAutoPlayNext, chunks.length, isRecording, loading]);

  // Handle chunk completion
  useEffect(() => {
    if (currentAudio) {
      const handleEnded = () => {
        setIsPlaying(false);
        setCurrentAudio(null);
        handleChunkCompletion();
      };
      
      currentAudio.addEventListener('ended', handleEnded);
      return () => currentAudio.removeEventListener('ended', handleEnded);
    }
  }, [currentAudio]);

  // Cleanup effect for recording timers
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  const loadChunks = async (dialogId: string) => {
    setLoading(true);
    try {
      // Clear any existing recording state
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        stopRecording();
      }
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      
      const data = await getAudioChunks(dialogId);
      setChunks(data);
      setCurrentChunkIndex(0);
      setIsPlaying(false);
      setUserRecordings([]);
      setIsPlaybackMode(false);
      setPlaybackIndex(0);
      setDialogInitialized(false); // Reset initialization flag
      setShouldAutoPlayNext(false); // Reset auto-play flag
      setIsRecording(false); // Reset recording state
      setRecordingTimer(0); // Reset timer
      setShowCountdown(false); // Reset countdown
      setCountdownTimer(0); // Reset countdown timer
      if (currentAudio) {
        currentAudio.pause();
        setCurrentAudio(null);
      }
    } catch (err) {
      setError('Failed to load audio chunks');
    } finally {
      setLoading(false);
    }
  };

  // Audio playback controls
  const playChunk = async (chunk: AudioChunk) => {
    // Cleanup any existing audio
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio.removeAttribute("src");
      currentAudio.load();
      setCurrentAudio(null);
    }
  
    try {
      const audio = new Audio(chunk.audio_url);
  
      audio.addEventListener('ended', () => {
        setIsPlaying(false);
        setCurrentAudio(null);
        handleChunkCompletion();
      });
  
      await audio.play();
      setIsPlaying(true);
      setCurrentAudio(audio);
    } catch (err) {
      console.error('Failed to play chunk:', err);
      setError('Failed to play audio');
      setIsPlaying(false);
    }
  };

  const pauseAudio = () => {
    if (currentAudio) {
      currentAudio.pause();
      setIsPlaying(false);
    }
  };

  const playCurrentChunk = async () => {
    const chunk = chunks[currentChunkIndex];
    if (chunk) {
      console.log('▶️ Playing current chunk index:', currentChunkIndex, 'URL:', chunk.audio_url);
      playChunk(chunk);
    }
  };

  const nextChunk = () => {
    if (currentChunkIndex < chunks.length - 1) {
      setCurrentChunkIndex(currentChunkIndex + 1);
      if (isPlaying) {
        pauseAudio();
      }
    }
  };

  const previousChunk = () => {
    if (currentChunkIndex > 0) {
      setCurrentChunkIndex(currentChunkIndex - 1);
      if (isPlaying) {
        pauseAudio();
      }
    }
  };

  const selectChunk = (index: number) => {
    setCurrentChunkIndex(index);
    if (isPlaying) {
      pauseAudio();
    }
  };

  const handleChunkCompletion = () => {
    // Start 5-second countdown before recording
    setShowCountdown(true);
    setCountdownTimer(5);
    
    const countdown = setInterval(() => {
      setCountdownTimer(prev => {
        if (prev <= 1) {
          clearInterval(countdown);
          setShowCountdown(false);
          startRecording();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    countdownIntervalRef.current = countdown;
  };

  const startRecording = async () => {
    if (isRecording) return; // prevent re-entry

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        const currentChunk = chunks[currentChunkIndex];
      
        if (currentChunk) {
          const recording: UserRecording = {
            chunkId: currentChunk.id,
            audioBlob,
            audioUrl,
            timestamp: new Date()
          };
      
          setUserRecordings(prev => [...prev, recording]);
          setIsRecording(false);
          setRecordingTimer(0);
      
          const nextIndex = currentChunkIndex + 1;
          if (nextIndex < chunks.length) {
            console.log('✅ Moving to next chunk after recording:', nextIndex);
            setCurrentChunkIndex(nextIndex);
            setShouldAutoPlayNext(true); // ✅ trigger autoplay cleanly
          } else {
            console.log('✅ All chunks completed, enabling playback mode');
            setIsPlaybackMode(true);
            setPlaybackIndex(0);
          }
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTimer(0);
      
      // Start recording timer (max 1 minute) - use setInterval for more reliable updates
      let startTime = Date.now();
      const timerInterval = setInterval(() => {
        if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== 'recording') {
          clearInterval(timerInterval);
          return;
        }

        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        if (elapsed >= 60) {
          stopRecording();
          clearInterval(timerInterval);
        } else {
          setRecordingTimer(elapsed); // no condition needed here
        }
      }, 1000);
      
      recordingIntervalRef.current = timerInterval;
    } catch (err) {
      setError('Failed to start recording');
    }
  };

  const stopRecording = () => {
    console.log('Stopping recording...');
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    }
  };

  const playBackRecording = (recording: UserRecording) => {
    if (playbackAudioRef.current) {
      playbackAudioRef.current.pause();
    }
    
    const audio = new Audio(recording.audioUrl);
    audio.play();
    playbackAudioRef.current = audio;
  };

  const startPlaybackMode = () => {
    setIsPlaybackMode(true);
    setPlaybackIndex(0);
    playNextInPlayback();
  };

  const playNextInPlayback = () => {
    if (playbackIndex >= chunks.length * 2) return; // Original + recording for each chunk
    
    const chunkIndex = Math.floor(playbackIndex / 2);
    const isOriginal = playbackIndex % 2 === 0;
    
    if (isOriginal) {
      // Play original chunk
      const chunk = chunks[chunkIndex];
      if (chunk) {
        playChunk(chunk);
      }
    } else {
      // Play user recording
      const chunk = chunks[chunkIndex];
      if (chunk) {
        const recording = userRecordings.find(r => r.chunkId === chunk.id);
        if (recording) {
          playBackRecording(recording);
        }
      }
    }
    
    setPlaybackIndex(playbackIndex + 1);
  };

  const getCurrentChunk = () => chunks[currentChunkIndex];

  const getSpeakerName = (speaker: 'en' | 'np') => {
    return speaker === 'en' ? 'English Speaker' : 'Nepali Speaker';
  };

  const getSpeakerIcon = (speaker: 'en' | 'np') => {
    return speaker === 'en' ? 
      <User className="h-4 w-4 text-blue-600" /> : 
      <User className="h-4 w-4 text-green-600" />;
  };

  const getTotalDuration = () => {
    return chunks.reduce((total, chunk) => total + (chunk.duration_seconds || 0), 0);
  };

  const getCurrentProgress = () => {
    if (!currentAudio) return 0;
    const currentTime = currentAudio.currentTime;
    const duration = currentAudio.duration;
    const chunkProgress = currentTime / duration;
    const completedChunks = currentChunkIndex;
    const totalChunks = chunks.length;
    
    return (completedChunks / totalChunks) + (chunkProgress / totalChunks);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
          <BookOpen className="h-8 w-8 text-blue-600" />
          Audio Dialog Practice
        </h1>
        <p className="text-gray-600">
          Practice interpreting skills with audio dialogs
        </p>
      </div>

      {/* Dialog Selection */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Select a Dialog</h2>
          <button
            onClick={() => setShowDialogModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            disabled={dialogs.length === 0}
          >
            Choose Dialog
          </button>
        </div>
        
        {selectedDialog ? (
          <div className="p-4 border border-blue-200 rounded-lg bg-blue-50">
            <h3 className="font-semibold text-gray-900 mb-2">{selectedDialog.title}</h3>
            <p className="text-sm text-gray-600 mb-2">{selectedDialog.language_pair}</p>
            {selectedDialog.description && (
              <p className="text-sm text-gray-500">{selectedDialog.description}</p>
            )}
            <button
              onClick={() => setShowDialogModal(true)}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              Change Dialog
            </button>
          </div>
        ) : dialogs.length === 0 ? (
          <div className="p-4 border border-yellow-200 rounded-lg bg-yellow-50">
            <p className="text-yellow-800">
              No audio dialogs available. Please ask an administrator to create some dialogs first.
            </p>
          </div>
        ) : (
          <p className="text-gray-500">No dialog selected. Click "Choose Dialog" to start practicing.</p>
        )}
      </div>

      {/* Dialog Selection Modal */}
      {showDialogModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">Select a Dialog</h3>
              <button
                onClick={() => setShowDialogModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            {dialogs.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">No audio dialogs available.</p>
                <p className="text-sm text-gray-400">Please ask an administrator to create some dialogs first.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {dialogs.map((dialog) => (
                  <div
                    key={dialog.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedDialog?.id === dialog.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => {
                      setSelectedDialog(dialog);
                      setShowDialogModal(false);
                    }}
                  >
                    <h3 className="font-semibold text-gray-900 mb-2">{dialog.title}</h3>
                    <p className="text-sm text-gray-600 mb-2">{dialog.language_pair}</p>
                    {dialog.description && (
                      <p className="text-sm text-gray-500">{dialog.description}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Audio Player */}
      {selectedDialog && chunks.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{selectedDialog.title}</h2>
              <p className="text-gray-600">{selectedDialog.language_pair}</p>
            </div>
            <div className="flex items-center gap-4">
              {!isPlaybackMode && userRecordings.length === chunks.length && (
                <button
                  onClick={startPlaybackMode}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <RotateCcw className="h-4 w-4 inline mr-2" />
                  Playback All
                </button>
              )}
            </div>
          </div>

          {/* Countdown Timer */}
          {showCountdown && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-8 text-center">
                <div className="text-6xl font-bold text-blue-600 mb-4">{countdownTimer}</div>
                <p className="text-lg text-gray-600">Recording starts in...</p>
              </div>
            </div>
          )}

          {/* Recording Interface */}
          {isRecording && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
              <div className="flex items-center justify-center gap-4 mb-4">
                <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-lg font-semibold text-red-700">Recording...</span>
                <span className="text-lg font-mono text-red-600">{formatTime(recordingTimer)}</span>
              </div>
              <button
                onClick={stopRecording}
                className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 mx-auto"
              >
                <Square className="h-5 w-5" />
                Stop Recording
              </button>
            </div>
          )}

          {/* Main Audio Player */}
          {!isRecording && !showCountdown && (
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  {getSpeakerIcon(getCurrentChunk()?.speaker || 'en')}
                  <span className="font-semibold text-gray-900">
                    {getSpeakerName(getCurrentChunk()?.speaker || 'en')}
                  </span>
                  <span className="text-sm text-gray-500">
                    Chunk {currentChunkIndex + 1} of {chunks.length}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Clock className="h-4 w-4" />
                  <span>Duration: {getCurrentChunk()?.duration_seconds || 'Unknown'}s</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-4 mb-4 relative">
                {/* Chunk underlay */}
                <div className="absolute inset-0 flex">
                  {chunks.map((chunk, index) => {
                    const chunkWidth = (chunk.duration_seconds || 0) / getTotalDuration() * 100;
                    return (
                      <div
                        key={chunk.id}
                        className="bg-gray-300 border-r border-white"
                        style={{ width: `${chunkWidth}%` }}
                      />
                    );
                  })}
                </div>
                {/* Progress overlay */}
                <div
                  className="bg-blue-600 h-4 rounded-full transition-all duration-300 relative z-10"
                  style={{ width: `${getCurrentProgress() * 100}%` }}
                ></div>
              </div>

              {/* Audio Controls */}
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={previousChunk}
                  disabled={currentChunkIndex === 0}
                  className="p-2 rounded-full bg-white shadow-sm hover:bg-gray-50 disabled:opacity-50"
                >
                  <SkipBack className="h-5 w-5" />
                </button>
                
                <button
                  onClick={isPlaying ? pauseAudio : playCurrentChunk}
                  className="p-4 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700"
                >
                  {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
                </button>
                
                <button
                  onClick={nextChunk}
                  disabled={currentChunkIndex === chunks.length - 1}
                  className="p-2 rounded-full bg-white shadow-sm hover:bg-gray-50 disabled:opacity-50"
                >
                  <SkipForward className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}

          {/* User Recordings */}
          {userRecordings.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4">Your Recordings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {userRecordings.map((recording, index) => {
                  const chunk = chunks.find(c => c.id === recording.chunkId);
                  return (
                    <div key={recording.chunkId} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Mic className="h-4 w-4 text-green-600" />
                          <span className="font-medium text-sm">Your Recording #{index + 1}</span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {recording.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => playBackRecording(recording)}
                          className="p-1 rounded hover:bg-gray-100"
                        >
                          <Play className="h-4 w-4" />
                        </button>
                        <audio
                          src={recording.audioUrl}
                          controls
                          className="w-full h-8"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Chunk List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {chunks.map((chunk, index) => (
              <div
                key={chunk.id}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  index === currentChunkIndex
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => selectChunk(index)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getSpeakerIcon(chunk.speaker)}
                    <span className="font-medium text-sm">{getSpeakerName(chunk.speaker)}</span>
                  </div>
                  <span className="text-xs text-gray-500">#{chunk.chunk_order}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      playChunk(chunk);
                    }}
                    className="p-1 rounded hover:bg-gray-100"
                  >
                    <Play className="h-4 w-4" />
                  </button>
                  <div className="flex-1">
                    <audio
                      src={chunk.audio_url}
                      controls
                      className="w-full h-8"
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded shadow-lg z-50">
          {error}
          <button className="ml-4" onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}
    </div>
  );
};

export default AudioPractice; 