import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { scaffoldSettings } from "./src/core/settings";
import { registerBeforeCompactHook, setBypassToPiCore } from "./src/hooks/before-compact";
import { registerVccRecallCommand } from "./src/commands/vcc-recall";
import { registerRecallTool } from "./src/tools/recall";
import { registerCompressCommand } from "./src/commands/compress";

export default (pi: ExtensionAPI) => {
  scaffoldSettings();
  registerBeforeCompactHook(pi);
  registerVccRecallCommand(pi);
  registerRecallTool(pi);
  registerCompressCommand(pi, setBypassToPiCore);
};
