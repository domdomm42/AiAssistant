import { useState, useEffect, useCallback, useRef } from "react";
import ChatBox from "./components/ChatBox";
import { SocketProvider } from "./context/SocketContext";

function App() {
  const [chatHistory, setChatHistory] = useState(() => {
    const savedHistory = sessionStorage.getItem("chatHistory");
    return savedHistory ? JSON.parse(savedHistory) : [];
  });

  const [currentResponse, setCurrentResponse] = useState("");
  const currentResponseRef = useRef("");
  const [audioQueue, setAudioQueue] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);

  const [chatSocket, setChatSocket] = useState(null);
  const [sttSocket, setSTTSocket] = useState(null);

  const addToHistory = useCallback((role, content) => {
    const newMessage = { role, content };
    return new Promise((resolve) => {
      setChatHistory((prev) => {
        const newHistory = [...prev, newMessage];
        sessionStorage.setItem("chatHistory", JSON.stringify(newHistory));
        console.log("Updated chat history");
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

  // Setup sockets and add text + audio message handlers
  useEffect(() => {
    let wsChat = null;
    let wsSTT = null;

    const connectWebSockets = () => {
      try {
        const backendUrl =
          import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
        const wsUrl = backendUrl.replace(/^http/, "ws");

        wsChat = new WebSocket(`${wsUrl}/ws/chat`);
        wsSTT = new WebSocket(`${wsUrl}/ws/stt`);

        wsChat.onopen = () => {
          console.log(
            "Chat WebSocket Connected, readyState:",
            wsChat.readyState
          );
          setChatSocket(wsChat);
        };

        wsSTT.onopen = () => {
          console.log("STT WebSocket Connected, readyState:", wsSTT.readyState);
          setSTTSocket(wsSTT);
        };

        wsSTT.onerror = (error) => {
          console.error("STT WebSocket Error:", error);
        };

        wsSTT.onclose = (event) => {
          console.log("STT WebSocket Closed", event.code, event.reason);
          setSTTSocket(null);
        };

        // Add message handlers
        wsChat.onmessage = async (event) => {
          const response = JSON.parse(event.data);
          if (response.status === "success") {
            if (response.type === "chunk") {
              currentResponseRef.current += response.text;
              setCurrentResponse(currentResponseRef.current);
            } else if (response.type === "audio") {
              setAudioQueue((prev) => [...prev, response.audio]);
            } else if (response.type === "complete") {
              await addToHistory("assistant", currentResponseRef.current);
              currentResponseRef.current = "";
              setCurrentResponse("");
            }
          }
        };
      } catch (error) {
        console.error("WebSocket connection error:", error);
      }
    };

    connectWebSockets();

    return () => {
      if (wsChat && wsChat.readyState === WebSocket.OPEN) {
        wsChat.close();
      }
      if (wsSTT && wsSTT.readyState === WebSocket.OPEN) {
        wsSTT.close();
      }
    };
  }, []);

  // audio playing
  useEffect(() => {
    const playNextAudio = async () => {
      if (audioQueue.length > 0 && !isPlaying) {
        setIsPlaying(true);
        console.log("Starting audio playback");

        try {
          if (!audioContextRef.current) {
            audioContextRef.current = new AudioContext();
          }

          analyserRef.current = audioContextRef.current.createAnalyser();
          analyserRef.current.fftSize = 1024;
          analyserRef.current.smoothingTimeConstant = 0.8;
          analyserRef.current.minDecibels = -90;
          analyserRef.current.maxDecibels = -10;

          const audio = new Audio(`data:audio/mp3;base64,${audioQueue[0]}`);
          await audio.play();

          const source =
            audioContextRef.current.createMediaElementSource(audio);
          source.connect(analyserRef.current);
          analyserRef.current.connect(audioContextRef.current.destination);

          const dataArray = new Uint8Array(
            analyserRef.current.frequencyBinCount
          );

          const analyzeVolume = () => {
            if (!audio.paused) {
              analyserRef.current.getByteFrequencyData(dataArray);

              const rms = Math.sqrt(
                dataArray.reduce((sum, value) => sum + value * value, 0) /
                  dataArray.length
              );

              const normalizedVolume = Math.min(rms / 128.0, 1);
              setVolume((prev) => prev * 0.8 + normalizedVolume * 0.2);

              requestAnimationFrame(analyzeVolume);
            } else {
              setVolume(0);
            }
          };

          analyzeVolume();

          audio.onended = () => {
            console.log("Audio ended");
            setAudioQueue((prev) => prev.slice(1));
            setIsPlaying(false);
            setVolume(0);
            source.disconnect();
          };
        } catch (error) {
          console.error("Audio playback error:", error);
          setIsPlaying(false);
          setVolume(0);
        }
      }
    };

    playNextAudio();
  }, [audioQueue, isPlaying]);

  return (
    <div className="h-screen bg-[#0A0A0A]">
      {/* Minimal Header */}
      <header className="px-8 py-5 bg-black/40">
        <div className="max-w-7xl flex items-center">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <svg
                className="w-4 h-4 text-white"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 16h2v-6h-2v6zm0-8h2V8h-2v2z" />
              </svg>
            </div>
            <h1 className="text-xl font-medium text-white">Voice AI</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto flex justify-center items-center gap-6 h-[calc(100vh-5rem)] py-12">
        {/* Left Side - Multiple Sections */}
        <div className="w-1/3 flex flex-col gap-4 h-full">
          {/* Status Cards */}
          <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-4 border border-white/5">
            <div className="flex flex-col">
              <span className="text-xs font-medium text-white/50">
                Messages
              </span>
              <span className="text-2xl font-semibold text-white/90">
                {chatHistory.length}
              </span>
            </div>
          </div>

          {/* Voice Activity (Smaller) */}
          <div className="h-full bg-black/40 backdrop-blur-sm rounded-2xl border border-white/5 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-white/90">
                Voice Activity
              </h2>
              {/* <div className="flex items-center gap-2">
                <span className="block w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                <span className="text-xs font-medium text-white/50">Live</span>
              </div> */}
              {isPlaying && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                  <span className="text-xs font-medium text-green-400">
                    Speaking
                  </span>
                </div>
              )}
            </div>
            <div className="h-full  rounded-xl flex items-center justify-between w-full">
              {[...Array(32)].map((_, i) => {
                const barHeight =
                  volume > 0.01
                    ? Math.max(
                        Math.random() * volume * 100 +
                          Math.random() * volume * 50,
                        2
                      )
                    : 2;
                return (
                  <div
                    key={i}
                    className="w-[2px] bg-gradient-to-t from-blue-500/50 to-blue-400/50 rounded-full transition-all duration-75"
                    style={{ height: `${barHeight}%` }}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Side - Chat */}
        <SocketProvider value={{ sttSocket, chatSocket }}>
          <div className="w-2/3 h-full bg-black/40 backdrop-blur-sm rounded-2xl border border-white/5">
            <ChatBox
              chatHistory={chatHistory}
              currentResponse={currentResponse}
              setCurrentResponse={setCurrentResponse}
              currentResponseRef={currentResponseRef}
              audioQueue={audioQueue}
              setAudioQueue={setAudioQueue}
              onAddHistory={addToHistory}
              onReset={handleReset}
            />
          </div>
        </SocketProvider>
      </main>
    </div>
  );
}

export default App;
