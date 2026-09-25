import React from "react";

/**
 * A consent line with the terms and the privacy policy as links: `text`
 * carries {terms} and {privacy} where the two links go.
 */
export default function LegalLinks({ text, termsLabel, privacyLabel, onOpen, className = "", linkClassName = "" }) {
  const link = (kind, label) => (
    <button key={kind} type="button" onClick={() => onOpen(kind)}
      className={`inline p-0 m-0 border-0 bg-transparent cursor-pointer font-semibold underline underline-offset-2 text-inherit ${linkClassName}`}>
      {label}
    </button>
  );
  const parts = text.split(/(\{terms\}|\{privacy\})/);
  return (
    <p className={className}>
      {parts.map((part, i) => (part === "{terms}" ? link("terms", termsLabel) : part === "{privacy}" ? link("privacy", privacyLabel) : <React.Fragment key={i}>{part}</React.Fragment>))}
    </p>
  );
}
