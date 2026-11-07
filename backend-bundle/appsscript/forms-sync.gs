/**
 * Retires the former response-to-Google-Sheets synchronization.
 *
 * This file intentionally contains no spreadsheet or response-copying logic.
 * Run removeEmbedxSheetsSync() once as the project owner after pushing this
 * version. Any old one-minute trigger that fires first also calls the cleanup
 * function and removes itself without syncing or emailing form responses.
 */
const EMBEDX_OWNER_EMAIL = "814725105014@trp.srmtrichy.edu.in";
const EMBEDX_OLD_SYNC_HANDLER = "syncEmbedxFormsToSheets";
const EMBEDX_OLD_SHEET_PROPERTY = "EMBEDX_FORMS_SPREADSHEET_ID";

function removeEmbedxSheetsSync() {
  const email = String(Session.getEffectiveUser().getEmail() || "").trim().toLowerCase();
  if (email !== EMBEDX_OWNER_EMAIL) {
    throw new Error("Run this cleanup while signed in as the allowlisted EMBEDX owner account.");
  }
  const triggers = ScriptApp.getProjectTriggers().filter(
    (trigger) => trigger.getHandlerFunction() === EMBEDX_OLD_SYNC_HANDLER
  );
  triggers.forEach((trigger) => ScriptApp.deleteTrigger(trigger));
  PropertiesService.getScriptProperties().deleteProperty(EMBEDX_OLD_SHEET_PROPERTY);
  const result = `Removed ${triggers.length} old response-sync trigger(s). Existing spreadsheet files and Firestore responses were left untouched.`;
  console.log(result);
  return result;
}

// Compatibility callback for an old installed trigger: safely retire it on its
// next scheduled run if the owner has not manually run removeEmbedxSheetsSync().
function syncEmbedxFormsToSheets() {
  return removeEmbedxSheetsSync();
}
