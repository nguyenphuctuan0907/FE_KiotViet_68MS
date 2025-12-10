// src/App.tsx
import React from "react";
import "./App.css";
import RoomView from "./components/RoomView";

const App: React.FC = () => {
  return (
    <div className="app-root">
      <RoomView />
    </div>
  );
};

export default App;
