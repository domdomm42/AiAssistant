import { useSpeechToText } from "../hooks/useSpeechToText";

export function AudioRecorder({ onTranscription }) {
  const { isRecording, startRecording, stopRecording, isReady } =
    useSpeechToText(onTranscription);

  const disabled = !isReady && !isRecording;

  return (
    <div className="flex flex-col">
      <button
        onClick={isRecording ? stopRecording : startRecording}
        disabled={disabled}
        className={`px-3 py-1.5 rounded-lg text-md font-medium transition-all duration-200 ${
          disabled
            ? "bg-white/5 text-white/40 cursor-not-allowed"
            : isRecording
            ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
            : "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
        }`}
      >
        {isRecording
          ? "Stop Listening"
          : isReady
          ? "Start Listening"
          : "Connecting…"}
      </button>
    </div>
  );
}
