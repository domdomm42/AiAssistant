import { useState, useEffect, useCallback } from "react";
import ChatBox from "./components/ChatBox";

function App() {
  const [chatHistory, setChatHistory] = useState(() => {
    const savedHistory = sessionStorage.getItem("chatHistory");
    return savedHistory ? JSON.parse(savedHistory) : [];
  });
  const [socket, setSocket] = useState(null);
  const [currentResponse, setCurrentResponse] = useState("");

  const addToHistory = useCallback((role, content) => {
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
  }, []);

  const handleReset = useCallback(() => {
    setChatHistory([]);
    setCurrentResponse("");
    sessionStorage.removeItem("chatHistory");
  }, []);

  // Socket handling
  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8000/ws");

    ws.onmessage = async (event) => {
      const response = JSON.parse(event.data);
      if (response.status === "success") {
        if (response.type === "chunk") {
          setCurrentResponse((prev) => {
            const newResponse = prev + response.text;
            return newResponse;
          });
        } else if (response.type === "complete") {
          setCurrentResponse((prev) => {
            addToHistory("assistant", prev);
            return "";
          });
        }
        if (response.audio) {
          const audio = new Audio(`data:audio/mp3;base64,${response.audio}`);
          audio.play();
        }
      }
    };

    setSocket(ws);
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">AI Assistant</h1>
        <ChatBox
          socket={socket}
          chatHistory={chatHistory}
          currentResponse={currentResponse}
          onAddHistory={addToHistory}
          onReset={handleReset}
        />
      </div>
    </div>
  );
}

export default App;
