import { useState, useEffect } from "react";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";

const ChatBox = () => {
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition();

  // Initialize chatHistory from sessionStorage
  const [chatHistory, setChatHistory] = useState(() => {
    const savedHistory = sessionStorage.getItem("chatHistory");
    return savedHistory ? JSON.parse(savedHistory) : [];
  });

  const [isListening, setIsListening] = useState(false);
  const [socket, setSocket] = useState(null);
  const [silenceTimer, setSilenceTimer] = useState(null);
  const silenceThreshold = 1500;

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

  const handleReset = () => {
    resetTranscript();
    setChatHistory([]);
    sessionStorage.removeItem("chatHistory");
  };

  const addToHistory = (role, content) => {
    const newMessage = { role, content };

    return new Promise((resolve) => {
      setChatHistory((prev) => {
        const newHistory = [...prev, newMessage];
        if (newHistory.length > 20) newHistory.shift();
        sessionStorage.setItem("chatHistory", JSON.stringify(newHistory));
        resolve();
        return newHistory;
      });
    });
  };

  const playAudio = (base64Audio) => {
    const audio = new Audio(`data:audio/mp3;base64,${base64Audio}`);
    audio.play();
  };

  // Socket handling
  useEffect(() => {
    const socket = new WebSocket("ws://localhost:8000/ws");

    socket.onmessage = (event) => {
      const response = JSON.parse(event.data);
      if (response.status === "success") {
        addToHistory("assistant", response.text);
        if (response.audio) {
          playAudio(response.audio);
        }
      }
    };

    setSocket(socket);

    return () => {
      if (socket) socket.close();
    };
  }, []);

  // Handle new transcript text
  useEffect(() => {
    if (!isListening || !socket) return;
    if (silenceTimer) clearTimeout(silenceTimer);

    const timer = setTimeout(async () => {
      if (transcript) {
        await addToHistory("user", transcript);

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
          onClick={handleReset}
          className="ml-2 px-4 py-2 bg-gray-500 hover:bg-gray-600 rounded-full"
        >
          Reset
        </button>
      </div>

      {/* Chat History */}
      <div className="mt-4 space-y-4 max-h-96 overflow-y-auto bg-gray-900 p-4 rounded-lg">
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
