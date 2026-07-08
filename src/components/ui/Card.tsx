import React from "react";

interface Props {
  children: React.ReactNode;
}

export default function Card({
  children,
}: Props) {
  return (
    <div
      style={{
        background: "#1e293b",
        borderRadius: 14,
        padding: 20,
        border: "1px solid #334155",
        boxShadow: "0 8px 20px rgba(0,0,0,.20)",
      }}
    >
      {children}
    </div>
  );
}