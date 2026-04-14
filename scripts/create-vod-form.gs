/**
 * NWL Scoreboard — VOD Submission Form Generator
 *
 * Creates a Google Form for submitting VOD links. Responses land as a new
 * "VODs" tab in the existing NWL data spreadsheet, so the GitHub Actions
 * auto-sync (extract-data.py) can read them on its next run.
 *
 * Setup (one-time):
 *   1. Go to https://script.google.com
 *   2. Create a new project (any name)
 *   3. Paste this entire file
 *   4. Run "createVodForm" (Play button)
 *   5. Accept the permission prompts (the script needs to create a form
 *      and add a tab to your NWL spreadsheet)
 *   6. The form URL is printed in the execution log (View → Logs)
 *   7. Copy that URL and paste it into public/app.js as VOD_SUBMIT_FORM_URL
 *      (the constant lives near the other Google Sheets IDs)
 *
 * After setup, anyone can submit a VOD via the form. New VODs appear on the
 * scoreboard within ~30 minutes (next auto-sync) — no code changes needed.
 */

function createVodForm() {
  // The NWL match-data spreadsheet — must match SPREADSHEET_ID in app.js
  // and extract-data.py. Form responses will be added as a new tab here.
  var NWL_SPREADSHEET_ID = '1vYy9Zsn7hVN3Z3sEW2S0GsXEMh1VVM_P7vn6C5LMFgY';

  var form = FormApp.create('NWL Scoreboard — Submit VOD');
  form.setDescription(
    'Submit a YouTube or Twitch VOD link for an NWL match.\n' +
    'Your VOD will show up as a ▶ Watch VOD button next to your name on ' +
    'the match scoreboard within ~30 minutes.\n\n' +
    'Scoreboard: https://nwl-scoreboard.vercel.app'
  );
  form.setConfirmationMessage(
    'VOD submitted! It will appear on the scoreboard within ~30 minutes.'
  );
  form.setAllowResponseEdits(false);
  form.setLimitOneResponsePerUser(false);
  form.setCollectEmail(false);

  form.addTextItem()
    .setTitle('NWL Number')
    .setHelpText('Just the number, e.g. "34" for NWL#34.')
    .setRequired(true);

  form.addTextItem()
    .setTitle('Your in-game / Discord name')
    .setHelpText('Same name as it appears on the scoreboard.')
    .setRequired(true);

  form.addTextItem()
    .setTitle('VOD URL')
    .setHelpText('Full YouTube or Twitch link.')
    .setRequired(true);

  // Attach responses to the NWL data spreadsheet (creates a new tab there).
  form.setDestination(FormApp.DestinationType.SPREADSHEET, NWL_SPREADSHEET_ID);

  // Rename the new response tab to "VODs" so extract-data.py can find it.
  // Apps Script may need a moment to materialize the destination sheet.
  Utilities.sleep(1500);
  var ss = SpreadsheetApp.openById(NWL_SPREADSHEET_ID);
  var renamed = false;
  var existingVodsTab = ss.getSheetByName('VODs');
  if (existingVodsTab) {
    Logger.log('NOTE: A "VODs" tab already exists. The new response tab was ' +
               'left with its default name — please rename it manually.');
  } else {
    var sheets = ss.getSheets();
    for (var i = 0; i < sheets.length; i++) {
      var name = sheets[i].getName();
      // Match both English and German default names
      if (name.indexOf('Form Responses') === 0 ||
          name.indexOf('Formularantworten') === 0) {
        sheets[i].setName('VODs');
        renamed = true;
        break;
      }
    }
  }

  Logger.log('=== VOD FORM CREATED ===');
  Logger.log('Edit form:   ' + form.getEditUrl());
  Logger.log('Public URL:  ' + form.getPublishedUrl());
  Logger.log('Spreadsheet: ' + ss.getUrl());
  Logger.log('Response tab renamed to "VODs": ' + renamed);
  Logger.log('');
  Logger.log('NEXT STEP: Paste the public URL into public/app.js as');
  Logger.log('  const VOD_SUBMIT_FORM_URL = ' + JSON.stringify(form.getPublishedUrl()) + ';');
}
