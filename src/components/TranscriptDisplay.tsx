import React, { useRef, useEffect, useState } from "react";
import { Copy, Check, Trash2 } from "lucide-react";
import { TranscriptSegment } from "../types";

interface TranscriptDisplayProps {
  segments: TranscriptSegment[];
  interimText: string;
  onClear?: () => void;
}

export const TranscriptDisplay: React.FC<TranscriptDisplayProps> = ({
  segments,
  interimText,
  onClear,
}) => {
  const [copied, setCopied] = useState(false);
  const displayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (displayRef.current) {
      displayRef.current.scrollTop = displayRef.current.scrollHeight;
    }
  }, [segments, interimText]);

  const finalText = segments.map((s) => s.text).join(" ");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(finalText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  return (
    <div className="flex-1 flex flex-col rounded-xl bg-white shadow-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
        <h2 className="text-sm font-medium text-gray-700">Transcript</h2>

        <div className="flex items-center gap-2">
          {finalText && (
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-md
                         bg-blue-500 text-white hover:bg-blue-600 transition"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy
                </>
              )}
            </button>
          )}

          {(segments.length > 0 || interimText) && onClear && (
            <button
              onClick={onClear}
              className="p-1.5 rounded-md text-gray-500 hover:text-red-500 hover:bg-red-50 transition"
              title="Clear transcript"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div
        ref={displayRef}
        className="flex-1 p-4 overflow-y-auto text-sm leading-relaxed"
      >
        {segments.length === 0 && !interimText ? (
          <p className="text-gray-400 italic text-center mt-10">
            Press and hold the microphone to start speaking…
          </p>
        ) : (
          <div className="space-y-2">
            {/* Final transcript */}
            {segments.map((segment) => (
              <p key={segment.id} className="text-gray-900">
                {segment.text}
              </p>
            ))}

            {/* LIVE interim transcript */}
            {interimText && (
              <p className="text-gray-400 italic animate-pulse">
                {interimText}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
