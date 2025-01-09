import { createContext, useContext } from "react";

const SocketContext = createContext();

export function SocketProvider({ children, value }) {
  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }

  return context;
}
