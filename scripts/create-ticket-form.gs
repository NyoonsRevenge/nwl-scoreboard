/**
 * NWL Scoreboard — Ticket Form Generator
 *
 * Instructions:
 * 1. Go to https://script.google.com
 * 2. Create a new project
 * 3. Paste this code
 * 4. Run "createTicketForm" (Play button)
 * 5. Accept permissions
 * 6. The form URL will be shown in the execution log
 */

function createTicketForm() {
  var form = FormApp.create('NWL Scoreboard — Ticket System');
  form.setDescription(
    'Report incorrect names, missing merges, or wrong stats on the NWL Scoreboard.\n\n' +
    'Scoreboard: https://nwl-scoreboard.vercel.app'
  );
  form.setConfirmationMessage('Thanks for your ticket! We\'ll look into it.');
  form.setAllowResponseEdits(false);
  form.setLimitOneResponsePerUser(false);
  form.setCollectEmail(false);

  // Your In-Game Name
  form.addTextItem()
    .setTitle('Your In-Game Name')
    .setHelpText('So we know who submitted the ticket.')
    .setRequired(true);

  // Ticket Type
  var ticketType = form.addMultipleChoiceItem()
    .setTitle('What\'s the issue?')
    .setRequired(true);

  // Sections for different ticket types
  var namePage = form.addPageBreakItem().setTitle('Wrong Name');
  var mergePage = form.addPageBreakItem().setTitle('Merge Needed');
  var statsPage = form.addPageBreakItem().setTitle('Wrong Stats');
  var otherPage = form.addPageBreakItem().setTitle('Other');
  var endPage = form.addPageBreakItem().setTitle('Done');

  // Ticket type choices with navigation
  ticketType.setChoices([
    ticketType.createChoice('Wrong name (display name is incorrect)', namePage),
    ticketType.createChoice('Merge needed (same player, separate entries)', mergePage),
    ticketType.createChoice('Wrong stats (kills/deaths/etc. are incorrect)', statsPage),
    ticketType.createChoice('Other', otherPage)
  ]);

  // === Wrong Name ===
  form.moveItem(form.addTextItem()
    .setTitle('What name is currently displayed?')
    .setRequired(true)
    .getIndex(), namePage.getIndex() + 1);

  form.moveItem(form.addTextItem()
    .setTitle('What should the name be instead?')
    .setRequired(true)
    .getIndex(), namePage.getIndex() + 2);

  namePage.setGoToPage(endPage);

  // === Merge Needed ===
  form.moveItem(form.addTextItem()
    .setTitle('Which entries should be merged?')
    .setHelpText('e.g. "MIXXD/Aly and MIXXD-Aly are the same player"')
    .setRequired(true)
    .getIndex(), mergePage.getIndex() + 1);

  form.moveItem(form.addTextItem()
    .setTitle('Desired display name after merge')
    .setHelpText('What should the merged entry be called?')
    .setRequired(true)
    .getIndex(), mergePage.getIndex() + 2);

  mergePage.setGoToPage(endPage);

  // === Wrong Stats ===
  form.moveItem(form.addTextItem()
    .setTitle('Which player is affected?')
    .setRequired(true)
    .getIndex(), statsPage.getIndex() + 1);

  form.moveItem(form.addTextItem()
    .setTitle('Which match? (NWL#)')
    .setHelpText('e.g. "NWL#24"')
    .setRequired(true)
    .getIndex(), statsPage.getIndex() + 2);

  form.moveItem(form.addParagraphTextItem()
    .setTitle('What exactly is wrong?')
    .setHelpText('e.g. "Kills shows 5, but should be 8"')
    .setRequired(true)
    .getIndex(), statsPage.getIndex() + 3);

  statsPage.setGoToPage(endPage);

  // === Other ===
  form.moveItem(form.addParagraphTextItem()
    .setTitle('Describe the issue')
    .setRequired(true)
    .getIndex(), otherPage.getIndex() + 1);

  otherPage.setGoToPage(endPage);

  // Optional: Screenshot
  form.moveItem(form.addTextItem()
    .setTitle('Screenshot link (optional)')
    .setHelpText('If you have a screenshot, upload it to e.g. Imgur and paste the link here.')
    .setRequired(false)
    .getIndex(), endPage.getIndex() + 1);

  // Output
  Logger.log('=== FORM CREATED ===');
  Logger.log('Edit:    ' + form.getEditUrl());
  Logger.log('Fill in: ' + form.getPublishedUrl());
  Logger.log('');
  Logger.log('Link this URL in the scoreboard:');
  Logger.log(form.getPublishedUrl());

  // Create spreadsheet for responses
  var ss = SpreadsheetApp.create('NWL Scoreboard — Tickets');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());
  Logger.log('');
  Logger.log('Responses sheet: ' + ss.getUrl());
}
