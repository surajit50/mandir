"use client";

import { useEffect } from "react";

export default function SessionCleanup() {
  useEffect(() => {
    const handleUnload = () => {
      navigator.sendBeacon("/api/auth/clear-session");
    };

    window.addEventListener("beforeunload", handleUnload);

    return () => {
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, []);

  return null;
}
