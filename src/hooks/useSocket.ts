import { useEffect, useState } from "react";
import { socket } from "@/lib/socket";
import { toast } from "sonner";

interface SocketMessage {
  type: string;
  data?: any;
}

type MessageCallback = (message: SocketMessage) => void;

/**
 * useSocket Hook (Legacy Wrapper)
 * Uses the singleton socket instance from @/lib/socket.
 * Components should prefer using useWebSocketListener or SocketContext directly.
 */
export const useSocket = (url?: string | null, onMessage?: MessageCallback) => {
  const [isConnected, setIsConnected] = useState(socket.connected);

  useEffect(() => {
    // Note: We don't connect/disconnect here anymore. 
    // Connection management is handled in SocketContext.

    const handleConnect = () => {
      setIsConnected(true);
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    const handleSocketMessage = (message: SocketMessage | any) => {
      if (onMessage) onMessage(message);

      // Legacy toast notifications
      if (message.type === "KYC_VERIFIED_SUCCESS") {
        toast.success("KYC Verified! 🎉", {
          description: "Your user can now borrow. Great work!",
        });
      }

      if (message.type === "NEW_APPLICATION") {
        toast.info("New Lead! 🔔", {
          description: "A new loan application has been submitted.",
        });
        const audio = new Audio("/notification.mp3");
        audio.play().catch(() => undefined);
      }
    };

    const handleSocketError = (error: unknown) => {
      console.error("Socket.io error:", error);
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("message", handleSocketMessage);
    socket.on("error", handleSocketError);

    // Initial state
    setIsConnected(socket.connected);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("message", handleSocketMessage);
      socket.off("error", handleSocketError);
    };
  }, [onMessage]);

  const sendMessage = (message: SocketMessage) => {
    if (socket?.connected) {
      socket.emit("message", message);
    }
  };

  return { isConnected, sendMessage, socket };
};
