import { useRef, useEffect } from "react";
import { AudioRecorder } from "./AudioRecorder";

const ChatBox = ({
  socket,
  chatHistory,
  currentResponse,
  onAddHistory,
  onReset,
}) => {
  const chatContainerRef = useRef(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [currentResponse, chatHistory]);

  const handleTranscription = (text) => {
    onAddHistory("user", text);
    if (socket) {
      socket.send(
        JSON.stringify({
          message: text,
          context: JSON.parse(sessionStorage.getItem("chatHistory") || "[]"),
        })
      );
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#1C1C1C] rounded-lg overflow-hidden w-full">
      {/* Chat History */}
      <div
        ref={chatContainerRef}
        className="flex-1 p-4 space-y-3 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-[#1C1C1C]"
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

      {/* Input Area */}
      <div className="p-4 border-t border-gray-700">
        <div className="flex items-center space-x-2">
          <AudioRecorder onTranscription={handleTranscription} />
          <button
            onClick={onReset}
            className="px-4 py-2 rounded-full text-sm font-medium bg-[#2D2D2D] hover:bg-[#3D3D3D] text-gray-200 transition-colors"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatBox;
