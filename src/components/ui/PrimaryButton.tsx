import React from "react";

interface Props {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
}

export default function PrimaryButton({
  children,
  onClick,
  type = "button",
}: Props) {
  return (
    <button
      type={type}
      onClick={onClick}
      style={{
        width: "100%",
        padding: "15px",
        background: "#2563eb",
        color: "white",
        border: "none",
        borderRadius: 10,
        cursor: "pointer",
        fontSize: 16,
        fontWeight: 700,
        transition: "0.2s",
      }}
    >
      {children}
    </button>
  );
}