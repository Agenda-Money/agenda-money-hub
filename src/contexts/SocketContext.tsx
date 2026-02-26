import React, { createContext, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./AuthContext";
import { useApplicant } from "./ApplicantContext";
import { toast } from "sonner";
import { getSubdomain } from "@/lib/domain";

interface SocketContextType {
  socket: Socket | null;
  notifications: any[];
}

const SocketContext = createContext<SocketContextType>({ socket: null, notifications: [] });

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const { user } = useAuth();
  const { applicant } = useApplicant();

  // Determine the active user identifier depending on the subdomain
  const sub = getSubdomain();
  const msisdn = sub === "apply" 
    ? applicant?.msisdn || (applicant as any)?.user?.msisdn
    : user?.phoneNumber || user?.alternatePhone; // Assuming AdminUser might have phone numbers, adjust if needed

  useEffect(() => {
    // Only connect if we have a valid identifier (msisdn)
    if (!msisdn) {
        if (socket) {
            socket.disconnect();
            setSocket(null);
        }
        return;
    }

    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
    
    // Connect to the socket server
    const newSocket = io(apiUrl, {
        transports: ["websocket"],
        autoConnect: true,
    });

    setSocket(newSocket);

    newSocket.on("connect", () => {
        console.log("Socket connected:", newSocket.id);
        // Join the user-specific room
        newSocket.emit("join-user-room", msisdn);
    });

    // Listen for real-time notifications
    newSocket.on("notifications", (items: any[]) => {
        console.log("Received real-time notifications:", items);
        
        // Extract new ones to show a toast, or just replace the list.
        // Assuming the backend sends the full updated list.
        setNotifications(items);
        
        // Optionally show toast for the newest item if desired (checking against previous length/ids is better)
        if (items && items.length > 0) {
           const latest = items[0];
           toast.info(`New Notification: ${latest.title || 'Update'}`, {
              description: latest.message || 'Check your dashboard for details.',
           });
        }
    });

    newSocket.on("disconnect", () => {
        console.log("Socket disconnected");
    });

    return () => {
        newSocket.disconnect();
    };
  }, [msisdn]);

  return (
    <SocketContext.Provider value={{ socket, notifications }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
