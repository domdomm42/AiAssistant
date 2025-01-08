import { useRef, useEffect } from "react";
import { AudioRecorder } from "./AudioRecorder";
import ReactMarkdown from "react-markdown";

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
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-gray-800 bg-black/30">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-medium text-gray-200">Chat Session</h2>
          <button
            onClick={onReset}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
          >
            Clear Chat
          </button>
        </div>
      </div>

      <div
        ref={chatContainerRef}
        className="flex-1 p-6 space-y-4 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent"
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
              <ReactMarkdown className="text-sm leading-relaxed text-gray-100">
                {message.content}
              </ReactMarkdown>
            </div>
          </div>
        ))}

        {/* Streaming Response */}
        {currentResponse && (
          <div className="flex justify-start">
            <div className="px-4 py-2 rounded-2xl max-w-[85%] bg-[#2D2D2D]">
              <p className="text-sm font-medium mb-1 text-gray-100">AI</p>
              <div className="prose prose-invert prose-sm max-w-none">
                <ReactMarkdown className="text-sm leading-relaxed text-gray-100">
                  {currentResponse}
                </ReactMarkdown>
                <span className="inline-block w-2 h-4 ml-1 bg-blue-500 animate-pulse" />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-6 border-t border-gray-800 bg-black/30">
        <AudioRecorder onTranscription={handleTranscription} />
      </div>
    </div>
  );
};

export default ChatBox;
