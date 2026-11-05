/**
 * EMBEDX — Task assignment mailer (Google Apps Script).
 *
 * SETUP (5 minutes, one time):
 *  1. Go to https://script.google.com → New project → paste this whole file.
 *  2. Change TOKEN below to any secret string you invent (e.g. "embedx-rotor-7421").
 *  3. Deploy → New deployment → type: Web app
 *       - Execute as: Me
 *       - Who has access: Anyone
 *     → Deploy → copy the /exec URL.
 *  4. Paste the URL and the same TOKEN into the website repo:
 *       public/js/config.js  →  export const taskMail = { url: ".../exec", token: "..." }
 *     (deploy hosting afterwards).
 *  5. Done: every task created in the portal now emails the assignee instantly,
 *     from YOUR Google account. If a task is assigned to a whole role, every
 *     admin holding that role gets the mail.
 *
 * SECURITY NOTES:
 *  - The web app only sends email when the request carries the correct TOKEN.
 *  - Keep the /exec URL + token semi-private (they live in the public config.js;
 *    worst case someone could send mails through your script — rotate TOKEN anytime
 *    by editing it here + in config.js and re-deploying both).
 */

const TOKEN = "CHANGE_ME_TO_A_SECRET_STRING";

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    if (!data || data.token !== TOKEN) {
      return ContentService.createTextOutput("denied");
    }
    const to = Array.isArray(data.to) ? data.to.join(",") : String(data.to || "");
    if (!to.includes("@")) return ContentService.createTextOutput("no-recipient");
    MailApp.sendEmail({
      to: to,
      subject: String(data.subject || "[EMBEDX Task] New task assigned"),
      htmlBody: String(data.html || "<p>A new task was assigned to you in the EMBEDX admin portal.</p>")
    });
    return ContentService.createTextOutput("ok");
  } catch (err) {
    return ContentService.createTextOutput("error: " + err.message);
  }
}

// Optional self-test: run once from the editor (Run → test) to verify mailing works.
function test() {
  MailApp.sendEmail(Session.getActiveUser().getEmail(), "[EMBEDX Task] mailer test", "<p>If you can read this, task mails work ✔</p>");
}
