import { useState, useEffect, useCallback, useRef } from "react";
import ChatBox from "./components/ChatBox";
import AudioVisualizingSphere from "./components/AudioVisualizingSphere";
function App() {
  const [chatHistory, setChatHistory] = useState(() => {
    const savedHistory = sessionStorage.getItem("chatHistory");
    return savedHistory ? JSON.parse(savedHistory) : [];
  });
  const [socket, setSocket] = useState(null);
  const [currentResponse, setCurrentResponse] = useState("");
  const [audioQueue, setAudioQueue] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);

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

  useEffect(() => {
    const playNextAudio = async () => {
      if (audioQueue.length > 0 && !isPlaying) {
        setIsPlaying(true);
        console.log("Starting audio playback");

        try {
          // Initialize audio context
          if (!audioContextRef.current) {
            audioContextRef.current = new AudioContext();
          }

          // Create new analyser for each audio
          analyserRef.current = audioContextRef.current.createAnalyser();
          analyserRef.current.fftSize = 256;

          const audio = new Audio(`data:audio/mp3;base64,${audioQueue[0]}`);
          await audio.play(); // Start playing before creating source

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
              const average =
                dataArray.reduce((acc, val) => acc + val, 0) / dataArray.length;
              const normalizedVolume = average / 128.0;
              console.log("Current volume:", normalizedVolume);
              setVolume(normalizedVolume);
              requestAnimationFrame(analyzeVolume);
            } else {
              setVolume(0);
            }
          };

          analyzeVolume(); // Start analysis immediately

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

  // Socket handling
  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8000/ws/chat");

    // Listens for messages from the server
    ws.onmessage = async (event) => {
      const response = JSON.parse(event.data);
      if (response.status === "success") {
        if (response.type === "chunk") {
          setCurrentResponse((prev) => {
            const newResponse = prev + response.text;
            return newResponse;
          });
        } else if (response.type === "audio") {
          setAudioQueue((prev) => [...prev, response.audio]);
        } else if (response.type === "complete") {
          setCurrentResponse((prev) => {
            addToHistory("assistant", prev);
            return "";
          });
        }
      }
    };

    setSocket(ws);
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="flex flex-row justify-center items-center h-screen">
        <div className="flex w-3/4 justify-center items-center">
          <AudioVisualizingSphere volume={volume} />
        </div>

        <div className="flex w-1/4 h-full p-4">
          <ChatBox
            socket={socket}
            chatHistory={chatHistory}
            currentResponse={currentResponse}
            onAddHistory={addToHistory}
            onReset={handleReset}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
