import { useSpeechToText } from "../hooks/useSpeechToText";

export function AudioRecorder({ onTranscription }) {
  const { isRecording, pendingText, startRecording, stopRecording } =
    useSpeechToText(onTranscription);

  return (
    <div className="flex flex-col">
      <button
        onClick={isRecording ? stopRecording : startRecording}
        className={`px-3 py-1.5 rounded-lg text-md font-medium transition-all duration-200 ${
          isRecording
            ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
            : "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
        }`}
      >
        {isRecording ? "Stop Listening" : "Start Listening"}
      </button>

      {pendingText && (
        <div className="text-sm text-gray-400 mt-2">{pendingText}</div>
      )}
    </div>
  );
}
