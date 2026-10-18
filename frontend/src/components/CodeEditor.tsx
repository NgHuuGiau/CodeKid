import Editor, { loader } from "@monaco-editor/react";
import { State } from "./ui";
loader.config({ paths: { vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.51.0/min/vs" } });
export default function CodeEditor({
  value,
  onChange,
  dark,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  dark: boolean;
  disabled: boolean;
}) {
  return (
    <Editor
      height="390px"
      language="python"
      theme={dark ? "vs-dark" : "vs"}
      value={value}
      onChange={(v) => onChange(v ?? "")}
      loading={<State loading />}
      options={{
        readOnly: disabled,
        fontSize: 18,
        lineHeight: 28,
        fontFamily: "Consolas, monospace",
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 4,
        padding: { top: 18 },
        wordWrap: "on",
        ariaLabel: "Trình soạn thảo Python",
        accessibilitySupport: "on",
      }}
    />
  );
}
