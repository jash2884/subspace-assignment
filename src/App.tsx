import { useState, useEffect, useRef, useCallback } from "react";
import { RecordButton } from "./components/RecordButton";
import { TranscriptDisplay } from "./components/TranscriptDisplay";
import { StatusIndicator } from "./components/StatusIndicator";
import { AudioService } from "./services/audioService";
import { DeepgramService } from "./services/deepgramService";
import { TranscriptSegment, RecordingState } from "./types";
import { Settings } from "lucide-react";

function App() {
  const [recordingState, setRecordingState] = useState<RecordingState>(
    RecordingState.IDLE
  );
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [interimText, setInterimText] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [micPermissionGranted, setMicPermissionGranted] = useState(false);

  const audioServiceRef = useRef<AudioService | null>(null);
  const deepgramServiceRef = useRef<DeepgramService | null>(null);

  useEffect(() => {
    const savedApiKey = localStorage.getItem("deepgram_api_key");
    if (savedApiKey) setApiKey(savedApiKey);
    else setShowSettings(true);

    audioServiceRef.current = new AudioService();
    requestMicrophoneAccess();

    return () => {
      audioServiceRef.current?.cleanup();
      deepgramServiceRef.current?.disconnect();
    };
  }, []);

  const requestMicrophoneAccess = async () => {
    if (!audioServiceRef.current) return false;
    const granted = await audioServiceRef.current.requestMicrophonePermission();
    setMicPermissionGranted(granted);
    if (!granted) setError("Microphone permission denied");
    return granted;
  };

  const handleTranscript = useCallback((text: string, isFinal: boolean) => {
    if (isFinal) {
      setSegments((prev) => [
        ...prev,
        { id: crypto.randomUUID(), text, timestamp: Date.now(), isFinal: true },
      ]);
      setInterimText("");
    } else {
      setInterimText(text);
    }
  }, []);

  const handleError = (err: Error) => {
    setError(err.message);
    setRecordingState(RecordingState.ERROR);
    setIsConnected(false);
  };

  const startRecording = async () => {
    if (!apiKey) {
      setShowSettings(true);
      return;
    }

    if (!micPermissionGranted) {
      const granted = await requestMicrophoneAccess();
      if (!granted) return;
    }

    setRecordingState(RecordingState.RECORDING);
    setError(null);

    deepgramServiceRef.current?.disconnect();
    deepgramServiceRef.current = new DeepgramService(apiKey);

    const dg = deepgramServiceRef.current;
    dg.connect(handleTranscript, handleError);

    const wait = setInterval(() => {
      if (dg.isConnected()) {
        clearInterval(wait);
        setIsConnected(true);
        audioServiceRef.current?.startRecording((pcm) => dg.sendAudio(pcm));
      }
    }, 50);
  };

  const stopRecording = () => {
    setRecordingState(RecordingState.PROCESSING);
    audioServiceRef.current?.stopRecording();
    setTimeout(() => {
      deepgramServiceRef.current?.disconnect();
      setIsConnected(false);
      setRecordingState(RecordingState.IDLE);
    }, 3000);
  };
  const handleClearTranscript = () => {
    setSegments([]);
    setInterimText("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-xl rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold tracking-wide">
            🎙 Voice to Text
          </h1>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 rounded-lg hover:bg-white/10"
          >
            <Settings size={18} />
          </button>
        </div>

        {showSettings && (
          <div className="mb-4 bg-black/30 p-4 rounded-xl">
            <label className="text-sm opacity-80">Deepgram API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="mt-2 w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 outline-none"
            />
            <button
              onClick={() => {
                localStorage.setItem("deepgram_api_key", apiKey);
                setShowSettings(false);
              }}
              className="mt-3 w-full bg-indigo-600 hover:bg-indigo-500 transition rounded-lg py-2"
            >
              Save
            </button>
          </div>
        )}

        <StatusIndicator
          recordingState={recordingState}
          isConnected={isConnected}
          error={error}
        />

        <div className="mt-4 h-64 overflow-y-auto rounded-xl bg-black/30 p-4 space-y-2">
          <TranscriptDisplay
            segments={segments}
            interimText={interimText}
            onClear={handleClearTranscript}
          />
        </div>

        <div className="mt-6 flex justify-center">
          <RecordButton
            recordingState={recordingState}
            onStartRecording={startRecording}
            onStopRecording={stopRecording}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
