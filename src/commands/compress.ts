import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

export const registerCompressCommand = (pi: ExtensionAPI, setBypassToPiCore: () => void) => {
  pi.registerCommand("compress", {
    description: "Compact conversation with default pi compaction (LLM-based)",
    handler: async (_args, ctx) => {
      setBypassToPiCore();
      ctx.compact({
        onError: (err) => {
          if (err.message === "Compaction cancelled" || err.message === "Already compacted") {
            ctx.ui.notify("Nothing to compact", "warning");
          } else {
            ctx.ui.notify(`Compaction failed: ${err.message}`, "error");
          }
        },
      });
    },
  });
};
