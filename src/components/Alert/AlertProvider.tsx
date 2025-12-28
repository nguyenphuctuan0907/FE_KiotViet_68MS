import React, { createContext, useContext, useState, useCallback } from "react";
import Alert, { type AlertProps } from "./index";

type AlertContextType = {
  showAlert: (props: Omit<AlertProps, "id">) => void;
};

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [alerts, setAlerts] = useState<AlertProps[]>([]);

  const showAlert = useCallback((props: Omit<AlertProps, "id">) => {
    const id = Date.now();
    const { duration = 5000 } = props;

    const newAlert: AlertProps = { ...props, id };
    setAlerts((prev) => [...prev, newAlert]);

    setTimeout(() => {
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    }, duration);
  }, []);

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      {alerts.map((alert) => (
        <Alert key={alert.id} {...alert} />
      ))}
    </AlertContext.Provider>
  );
};

export const useAlertContext = () => {
  const ctx = useContext(AlertContext);
  if (!ctx) throw new Error("useAlertContext must be used within AlertProvider");
  return ctx;
};
