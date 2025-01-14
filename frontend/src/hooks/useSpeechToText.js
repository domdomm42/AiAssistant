import { useState, useRef, useEffect } from "react";
import { useSocket } from "../context/SocketContext";

// the chatSocket gets sent to /ws/chat
export function useSpeechToText(onTranscription) {
  const [isRecording, setIsRecording] = useState(false);
  const { sttSocket } = useSocket();

  const voiceRecorder = useRef(null);

  // Setup Speech to Text websocket handler, for final STT transcription, send it to the onTranscription callback
  useEffect(() => {
    if (sttSocket?.readyState === WebSocket.OPEN) {
      // Set up message handler for transcriptions
      sttSocket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === "transcription" && message.is_final) {
          onTranscription(message.text);
        }
      };

      return () => {
        if (sttSocket) {
          sttSocket.onmessage = null;
        }
      };
    }
  }, [sttSocket, onTranscription]);

  // record and send data through the sttSocket to the backend
  const startRecording = async () => {
    try {
      if (!sttSocket || sttSocket.readyState !== WebSocket.OPEN) {
        return;
      }

      if (voiceRecorder.current) {
        voiceRecorder.current.resume();
        setIsRecording(true);
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      voiceRecorder.current = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
        audioBitsPerSecond: 16000,
      });

      voiceRecorder.current.ondataavailable = (event) => {
        if (sttSocket?.readyState === WebSocket.OPEN) {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64Data = reader.result.split(",")[1];
            sttSocket.send(base64Data);
          };
          reader.readAsDataURL(event.data);
        } else {
          console.error("Socket not open, readyState:", sttSocket?.readyState);
        }
      };

      voiceRecorder.current.start(200);
      setIsRecording(true);
    } catch (error) {
      console.error("Error accessing microphone", error);
    }
  };

  const stopRecording = () => {
    if (voiceRecorder.current) {
      try {
        voiceRecorder.current.pause();
      } catch (error) {
        console.error("Error pausing recording:", error);
      }
      setIsRecording(false);
    }
  };

  return { isRecording, startRecording, stopRecording };
}
