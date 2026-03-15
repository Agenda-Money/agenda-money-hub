import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { socket, joinUserRooms } from "@/lib/socket";
import { useAuth } from "./AuthContext";
import { useApplicant } from "./ApplicantContext";
import { getSubdomain } from "@/lib/domain";

interface SocketContextType {
  socket: any;
  notifications: any[];
}

const SocketContext = createContext<SocketContextType>({ socket: null, notifications: [] });

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const lastNotificationIdRef = useRef<string | number | null>(null);
  const { user } = useAuth();
  const { applicant } = useApplicant();

  // Determine the active user identifier depending on the subdomain
  const sub = getSubdomain();
  const msisdn = sub === "apply" 
    ? applicant?.msisdn || (applicant as any)?.user?.msisdn
    : user?.phoneNumber || user?.alternatePhone;

  useEffect(() => {
    // Only connect if we have a valid identifier (msisdn)
    if (!msisdn) {
        if (socket.connected) {
            socket.disconnect();
        }
        return;
    }

    // Connect to the socket server using the singleton
    if (!socket.connected) {
        (socket as any).io.opts.query = { msisdn };
        socket.connect();
    }

    const handleConnect = () => {
        joinUserRooms(msisdn);
    };

    const handleNotifications = (items: any[]) => {
        setNotifications(items);
        if (items && items.length > 0) {
           const latest = items[0];
           const latestId = latest._id || latest.id;
           if (latestId && latestId !== lastNotificationIdRef.current) {
             lastNotificationIdRef.current = latestId;
           }
        }
    };

    const handleDisconnect = () => {
    };

    socket.on("connect", handleConnect);
    socket.on("notifications", handleNotifications);
    socket.on("disconnect", handleDisconnect);

    // If already connected (e.g. from a fast re-render or previous session), join room immediately
    if (socket.connected) {
        handleConnect();
    }

    return () => {
        socket.off("connect", handleConnect);
        socket.off("notifications", handleNotifications);
        socket.off("disconnect", handleDisconnect);
    };
  }, [msisdn]);

  return (
    <SocketContext.Provider value={{ socket, notifications }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocketContext = () => useContext(SocketContext);
