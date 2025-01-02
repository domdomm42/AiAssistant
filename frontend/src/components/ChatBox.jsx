import { useState } from "react";
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

  const [isListening, setIsListening] = useState(false);

  if (!browserSupportsSpeechRecognition) {
    return <span>Browser doesn&apos;t support speech recognition.</span>;
  }

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

  return (
    <div className="p-4 bg-gray-800 rounded-lg">
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
          onClick={resetTranscript}
          className="ml-2 px-4 py-2 bg-gray-500 hover:bg-gray-600 rounded-full"
        >
          Reset
        </button>
      </div>

      <div className="mt-4">
        <p className="text-gray-400">Microphone: {listening ? "on" : "off"}</p>
        <p className="text-white mt-2">Transcript: {transcript}</p>
      </div>
    </div>
  );
};

export default ChatBox;
