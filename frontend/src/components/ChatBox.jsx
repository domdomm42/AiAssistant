import { useState, useEffect, useRef } from "react";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";

const ChatBox = ({
  socket,
  chatHistory,
  currentResponse,
  onAddHistory,
  onReset,
}) => {
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition();

  const [isListening, setIsListening] = useState(false);
  const [silenceTimer, setSilenceTimer] = useState(null);
  const silenceThreshold = 1000;

  const chatContainerRef = useRef(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [currentResponse, chatHistory]);

  const startListening = () => {
    SpeechRecognition.startListening({
      continuous: true,
    });
    setIsListening(true);
  };

  const stopListening = () => {
    SpeechRecognition.stopListening();
    setIsListening(false);
  };

  // Handle new transcript text
  useEffect(() => {
    if (!isListening || !socket) return;
    if (silenceTimer) clearTimeout(silenceTimer);

    const timer = setTimeout(async () => {
      if (transcript) {
        await onAddHistory("user", transcript);
        socket.send(
          JSON.stringify({
            message: transcript,
            context: JSON.parse(sessionStorage.getItem("chatHistory") || "[]"),
          })
        );
        resetTranscript();
      }
    }, silenceThreshold);

    setSilenceTimer(timer);

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [transcript, isListening, socket]);

  if (!browserSupportsSpeechRecognition) {
    return <span>Browser doesn&apos;t support speech recognition.</span>;
  }

  return (
    <div className="flex flex-col h-full bg-[#1C1C1C] rounded-lg overflow-hidden w-full">
      {/* Chat History */}
      <div
        ref={chatContainerRef}
        className="flex-1 p-4 space-y-3 overflow-y-auto"
      >
        {chatHistory.map((message, index) => (
          <div
            key={index}
            className={`flex ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`px-4 py-2 rounded-2xl max-w-[85%] ${
                message.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-[#2D2D2D] text-gray-100"
              }`}
            >
              <p className="text-sm font-medium mb-1">
                {message.role === "user" ? "You" : "AI"}
              </p>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {message.content}
              </p>
            </div>
          </div>
        ))}

        {/* Streaming Response */}
        {currentResponse && (
          <div className="flex justify-start">
            <div className="px-4 py-2 rounded-2xl max-w-[85%] bg-[#2D2D2D] text-gray-100">
              <p className="text-sm font-medium mb-1">AI</p>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {currentResponse}
                <span className="inline-block w-2 h-4 ml-1 bg-blue-500 animate-pulse" />
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Controls Footer */}
      <div className="p-4 border-t border-gray-800 bg-[#1C1C1C]">
        <div className="flex items-center gap-2">
          <button
            onClick={isListening ? stopListening : startListening}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              isListening
                ? "bg-red-500 hover:bg-red-600 text-white"
                : "bg-blue-500 hover:bg-blue-600 text-white"
            }`}
          >
            {isListening ? "Stop Listening" : "Start Listening"}
          </button>
          <button
            onClick={onReset}
            className="px-4 py-2 rounded-full text-sm font-medium bg-[#2D2D2D] hover:bg-[#3D3D3D] text-gray-200 transition-colors"
          >
            Reset
          </button>
        </div>

        {/* Status */}
        <div className="mt-3 space-y-1">
          <p className="text-sm text-gray-400">
            Microphone: {listening ? "on" : "off"}
          </p>
          {transcript && (
            <p className="text-sm text-gray-300">Current: {transcript}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatBox;
