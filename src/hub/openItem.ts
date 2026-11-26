import * as SDK from "azure-devops-extension-sdk";
import { IWorkItemFormNavigationService, WorkItemTrackingServiceIds } from "azure-devops-extension-api/WorkItemTracking";

/** Kaydı Azure DevOps'un iş öğesi penceresinde açar; servis alınamazsa kaydın sayfası yeni sekmede açılır. */
export function dialogOpener(url: (id: number, project?: string) => string) {
  return (id: number, project?: string) => {
    SDK.getService<IWorkItemFormNavigationService>(WorkItemTrackingServiceIds.WorkItemFormNavigationService)
      .then((nav) => nav.openWorkItem(id))
      .catch(() => window.open(url(id, project), "_blank", "noopener"));
  };
}
