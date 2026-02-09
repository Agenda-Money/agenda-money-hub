import { useEffect, useMemo, useState } from "react";
import { io, Socket } from "socket.io-client";
import { toast } from "sonner";

interface SocketMessage {
  type: string;
  data?: any;
}

type MessageCallback = (message: SocketMessage) => void;

export const useSocket = (url?: string | null, onMessage?: MessageCallback) => {
  const [isConnected, setIsConnected] = useState(false);

  const socket: Socket | null = useMemo(() => {
    if (!url) return null;
    return io(url, {
      transports: ["websocket"],
      autoConnect: true,
    });
  }, [url]);

  useEffect(() => {
    if (!socket) {
      setIsConnected(false);
      return;
    }

    const handleConnect = () => {
      setIsConnected(true);
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    const handleSocketMessage = (message: SocketMessage) => {
      if (onMessage) onMessage(message);

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

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("message", handleSocketMessage);
      socket.off("error", handleSocketError);
      setIsConnected(false);
      socket.disconnect();
    };
  }, [socket, onMessage]);

  const sendMessage = (message: SocketMessage) => {
    if (socket?.connected) {
      socket.emit("message", message);
    }
  };

  return { isConnected, sendMessage, socket };
};
