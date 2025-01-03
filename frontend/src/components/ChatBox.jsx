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
    <div className="p-4 bg-gray-800 rounded-lg">
      {/* Controls */}
      <div className="mb-4">
        <button
          onClick={isListening ? stopListening : startListening}
          className={`px-4 py-2 rounded-full ${
            isListening
              ? "bg-red-500 hover:bg-red-600"
              : "bg-blue-500 hover:bg-blue-600"
          }`}
        >
          {isListening ? "Stop Listening" : "Start Listening"}
        </button>
        <button
          onClick={onReset}
          className="ml-2 px-4 py-2 bg-gray-500 hover:bg-gray-600 rounded-full"
        >
          Reset
        </button>
      </div>

      {/* Chat History */}
      <div
        ref={chatContainerRef}
        className="mt-4 space-y-4 max-h-96 overflow-y-auto bg-gray-900 p-4 rounded-lg"
      >
        {chatHistory.map((message, index) => (
          <div
            key={index}
            className={`flex ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`p-3 rounded-lg max-w-[80%] ${
                message.role === "user" ? "bg-blue-600" : "bg-gray-700"
              }`}
            >
              <p className="text-sm text-gray-300 mb-1">
                {message.role === "user" ? "You" : "AI"}
              </p>
              <p className="text-white whitespace-pre-wrap">
                {message.content}
              </p>
            </div>
          </div>
        ))}

        {/* Streaming Response */}
        {currentResponse && (
          <div className="flex justify-start">
            <div className="p-3 rounded-lg max-w-[80%] bg-gray-700">
              <p className="text-sm text-gray-300 mb-1">AI</p>
              <p className="text-white whitespace-pre-wrap">
                {currentResponse}
                {/* <span className="animate-pulse">▊</span> */}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Current Status */}
      <div className="mt-4">
        <p className="text-gray-400">Microphone: {listening ? "on" : "off"}</p>
        <p className="text-white mt-2">Current: {transcript}</p>
      </div>
    </div>
  );
};

export default ChatBox;
