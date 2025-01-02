import ChatBox from "./components/ChatBox";

function App() {
  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">AI Assistant</h1>
        <ChatBox />
      </div>
    </div>
  );
}

export default App;
