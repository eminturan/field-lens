import * as React from "react";
import { Tooltip } from "azure-devops-ui/TooltipEx";
import { Icon } from "./icons";

/** Etiket yanındaki ⓘ: üzerine gelince, klavyeyle odaklanınca açıklama gösterir (Azure DevOps ipucu). */
export function Help({ text, label }: { text: string; label: string }) {
  return (
    <Tooltip text={text} showOnFocus addAriaDescribedBy delayMs={150}>
      <button type="button" className="fl-help" aria-label={label}>
        <Icon name="info" size={14} />
      </button>
    </Tooltip>
  );
}
