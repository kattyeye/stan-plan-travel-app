import React from "react";

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  id?: string;
}

export default function TextInput({ id, ...props }: Props) {
  return (
    <input
      id={id}
      {...props}
      style={{
        width: "100%",
        padding: "0.625rem 0.875rem",
        borderRadius: "10px",
        border: "1px solid var(--color-tea-green-200)",
        background: "#ffffff",
        color: "var(--color-tea-green-950)",
        fontSize: "0.9375rem",
        outline: "none",
        boxSizing: "border-box",
        transition: "border-color 0.15s",
        ...props.style,
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = "var(--color-tea-green-600)";
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = "var(--color-tea-green-200)";
        props.onBlur?.(e);
      }}
    />
  );
}
