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
        borderRadius: "var(--radius-input)",
        border: "1px solid var(--color-border)",
        background: "var(--color-bg-input)",
        color: "var(--color-text)",
        fontSize: "0.9375rem",
        outline: "none",
        boxSizing: "border-box",
        transition: "border-color 0.15s",
        ...props.style,
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = "var(--color-border-focus)";
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = "var(--color-border)";
        props.onBlur?.(e);
      }}
    />
  );
}
