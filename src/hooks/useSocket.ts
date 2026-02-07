import { useEffect, useMemo, useState } from "react";
import { io, Socket } from "socket.io-client";
import { toast } from "sonner";

interface SocketMessage {
  type: string;
  data?: any;
}

type MessageCallback = (message: SocketMessage) => void;

export const useSocket = (url: string, onMessage?: MessageCallback) => {
  const [isConnected, setIsConnected] = useState(false);

  const socket: Socket = useMemo(
    () =>
      io(url, {
        transports: ["websocket"],
        autoConnect: true,
      }),
    [url]
  );

  useEffect(() => {
    const handleConnect = () => {
      setIsConnected(true);
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    const handleSocketMessage = (message: SocketMessage) => {
      // Call custom callback if provided
      if (onMessage) {
        onMessage(message);
      }

      // Handle KYC verification success for agents
      if (message.type === "KYC_VERIFIED_SUCCESS") {
        toast.success("KYC Verified! 🎉", {
          description: "Your user can now borrow. Great work!",
        });
      }

      // Handle new application notifications for admins
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

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("message", handleSocketMessage);
      socket.off("error", handleSocketError);
      socket.disconnect();
    };
  }, [socket, onMessage]);

  const sendMessage = (message: SocketMessage) => {
    if (socket.connected) {
      socket.emit("message", message);
    }
  };

  return { isConnected, sendMessage, socket };
};
