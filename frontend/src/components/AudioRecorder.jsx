import { useState, useRef } from "react";

export function AudioRecorder({ onTranscription }) {
  const [isListening, setIsListening] = useState(false);
  const [pendingText, setPendingText] = useState(null);
  const mediaRecorder = useRef(null);
  const socket = useRef(null);

  const startRecording = async () => {
    try {
      // create WebSocket connection for streaming
      socket.current = new WebSocket("ws://localhost:8000/ws/stt");

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
        audioBitsPerSecond: 48000,
      });

      mediaRecorder.current.ondataavailable = (event) => {
        if (
          event.data.size > 0 &&
          socket.current?.readyState === WebSocket.OPEN
        ) {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64Data = reader.result.split(",")[1];
            socket.current.send(base64Data);
          };
          reader.readAsDataURL(event.data);
        }
      };

      // Handle incoming transcriptions
      socket.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "transcription") {
          console.log("Transcription received:", data.text);
          setPendingText(data.text);
          if (data.is_final) {
            onTranscription(data.text);
            setPendingText(null);
          }
        }
      };

      mediaRecorder.current.start(250); // send audio chunks every 250ms
      setIsListening(true);
    } catch (error) {
      console.error("Error starting recording:", error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current) {
      mediaRecorder.current.stop();
      mediaRecorder.current.stream.getTracks().forEach((track) => track.stop());
    }
    if (socket.current) {
      socket.current.close();
    }
    setIsListening(false);
  };

  return (
    <div className="flex flex-col">
      <button
        onClick={isListening ? stopRecording : startRecording}
        className={`px-4 py-2 rounded ${
          isListening
            ? "bg-red-500 hover:bg-red-600"
            : "bg-blue-500 hover:bg-blue-600"
        }`}
      >
        {isListening ? "Stop Listening" : "Start Listening"}
      </button>

      {pendingText && (
        <div className="text-sm text-gray-400 mt-2">{pendingText}</div>
      )}
    </div>
  );
}
