import Editor, { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import "monaco-editor/esm/vs/basic-languages/python/python.contribution";
import EditorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import { State } from "./ui";
self.MonacoEnvironment = { getWorker: () => new EditorWorker() };
loader.config({ monaco });
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
