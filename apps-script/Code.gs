/**
 * Dark Team Fantasy — Google Apps Script API
 *
 * First run: Dark Team > Setup league
 * Deploy: Deploy > New deployment > Web app
 *   Execute as: Me
 *   Who has access: Anyone
 * Paste the /exec URL and League Key into the iPhone app.
 * Reads use doGet. Squad writes use doPost into the Picks sheet.
 */

var SHEETS = {
  instructions: 'Instructions',
  config: 'Config',
  players: 'Players',
  gameweeks: 'Gameweeks',
  matchStats: 'MatchStats',
  picks: 'Picks',
  scoring: 'Scoring',
  bonuses: 'BonusScoring',
  live: 'LiveTable',
};

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Dark Team')
    .addItem('Setup league', 'setupLeague')
    .addItem('Add next gameweek', 'addGameweek')
    .addItem('Lock current gameweek', 'lockCurrentGameweek')
    .addItem('Unlock current gameweek', 'unlockCurrentGameweek')
    .addItem('Recalculate standings', 'recalculateStandings')
    .addToUi();
}

function onEdit(e) {
  try {
    if (!shouldRefreshLiveTable_(e)) return;
    refreshLiveTable_();
    SpreadsheetApp.getActive().toast('LiveTable updated from MatchStats');
  } catch (err) {
    SpreadsheetApp.getActive().toast('Could not update LiveTable: ' + (err && err.message ? err.message : err));
  }
}

function doGet(e) {
  return handleRequest_(e, null);
}

function doPost(e) {
  var body = {};
  try {
    if (e && e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }
  } catch (err) {
    return json_({ ok: false, error: 'Invalid JSON body.' }, e);
  }
  return handleRequest_(e, body);
}

function handleRequest_(e, body) {
  try {
    var params = (e && e.parameter) || {};
    var action = (body && body.action) || params.action || 'bootstrap';
    var key = (body && body.leagueKey) || params.key || '';
    ensureSheets_();
    if (action !== 'health') assertKey_(key);

    if (action === 'health') {
      var cfg = getConfig_();
      return json_({ ok: true, leagueName: cfg.leagueName, seasonName: cfg.seasonName }, e);
    }
    if (action === 'bootstrap') return json_(buildApiBootstrap_(), e);
    if (action === 'savePicks') {
      var payload = body && body.managerId ? body : {
        managerId: params.managerId,
        gameweekId: params.gameweekId,
        playerIds: String(params.playerIds || '').split(',').filter(Boolean),
        captainId: params.captainId,
        chip: params.chip || 'none',
      };
      return json_(savePicks_(payload), e);
    }
    if (action === 'recalculate') {
      refreshLiveTable_();
      return json_({ ok: true }, e);
    }
    return json_({ ok: false, error: 'Unknown action: ' + action }, e);
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message ? err.message : err) }, e);
  }
}

function json_(data, e) {
  var text = JSON.stringify(data);
  var cb = e && e.parameter && e.parameter.callback;
  var out = ContentService.createTextOutput(cb ? cb + '(' + text + ')' : text);
  out.setMimeType(cb ? ContentService.MimeType.JAVASCRIPT : ContentService.MimeType.JSON);
  return out;
}

function assertKey_(key) {
  var expected = String(getConfig_().leagueKey || '').trim();
  if (!expected) return;
  if (String(key || '').trim() !== expected) {
    throw new Error('Invalid league key.');
  }
}

/* -------------------------------------------------------------------------- */
/* Setup                                                                      */
/* -------------------------------------------------------------------------- */

function setupLeague() {
  var ss = SpreadsheetApp.getActive();
  ss.setSpreadsheetTimeZone(ss.getSpreadsheetTimeZone() || 'America/New_York');

  var existing = ss.getSheetByName(SHEETS.players);
  if (existing && existing.getLastRow() > 1) {
    var ui = SpreadsheetApp.getUi();
    var res = ui.alert(
      'Dark Team Fantasy',
      'Players already exist. Rebuild instructions and formatting only? Player data will be kept.',
      ui.ButtonSet.YES_NO
    );
    if (res !== ui.Button.YES) return;
    ensureSheets_();
    formatAll_();
    writeInstructions_();
    refreshLiveTable_();
    return;
  }

  ensureSheets_();
  seedConfig_();
  seedPlayers_();
  seedScoring_();
  seedBonuses_();
  seedGameweeks_();
  seedMatchStatRows_('gw1');
  formatAll_();
  writeInstructions_();
  refreshLiveTable_();
  SpreadsheetApp.getActive().toast('Dark Team Fantasy is ready. Copy the League Key from Config.');
}

function ensureSheets_() {
  var ss = SpreadsheetApp.getActive();
  Object.keys(SHEETS).forEach(function (k) {
    if (!ss.getSheetByName(SHEETS[k])) ss.insertSheet(SHEETS[k]);
  });
  setHeaders_(SHEETS.config, ['key', 'value']);
  setHeaders_(SHEETS.players, ['id', 'name', 'position', 'price', 'isSub', 'shirt', 'active']);
  setHeaders_(SHEETS.gameweeks, [
    'id', 'number', 'name', 'opponent', 'kickoff', 'deadline', 'status',
    'goalsFor', 'goalsAgainst', 'venue', 'notes', 'youtubeUrl',
  ]);
  ensureHeaderColumn_(SHEETS.gameweeks, 'youtubeUrl');
  setHeaders_(SHEETS.matchStats, [
    'gameweekId', 'playerId', 'played', 'goals', 'assists', 'defCons', 'inFieldGoals',
    'yellowCards', 'redCards', 'missedPenalties', 'errorsLedToGoal', 'motm',
    'secondMvp', 'recognitionPoints', 'winningGoal', 'winningDc',
  ]);
  setHeaders_(SHEETS.picks, [
    'gameweekId', 'managerId', 'player1', 'player2', 'player3', 'player4', 'player5',
    'captainId', 'chip', 'submittedAt',
  ]);
  setHeaders_(SHEETS.scoring, [
    'position', 'goalPts', 'assistPts', 'dcPerPoint', 'cleanSheetPts',
    'inFieldGoalBonus', 'concedePerMinus',
  ]);
  setHeaders_(SHEETS.bonuses, ['event', 'points', 'notes']);
  setHeaders_(SHEETS.live, ['kind', 'rank', 'id', 'name', 'detail', 'gwPoints', 'totalPoints']);
}

function setHeaders_(name, headers) {
  var sheet = SpreadsheetApp.getActive().getSheetByName(name);
  var lastCol = Math.max(sheet.getLastColumn(), headers.length);
  var current = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var empty = current.every(function (cell) { return cell === ''; });
  if (empty) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    return;
  }
  headers.forEach(function (header) {
    ensureHeaderColumn_(name, header);
  });
}

function ensureHeaderColumn_(name, columnName) {
  var sheet = SpreadsheetApp.getActive().getSheetByName(name);
  var lastCol = Math.max(sheet.getLastColumn(), 1);
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function (h) {
    return String(h).trim();
  });
  if (headers.indexOf(columnName) === -1) {
    sheet.getRange(1, headers.length + 1).setValue(columnName);
  }
}

function seedConfig_() {
  var key = PropertiesService.getDocumentProperties().getProperty('LEAGUE_KEY');
  if (!key) {
    key = randomKey_();
    PropertiesService.getDocumentProperties().setProperty('LEAGUE_KEY', key);
  }
  writeRows_(SHEETS.config, [
    ['leagueName', 'Dark Team Fantasy'],
    ['seasonName', '2026'],
    ['budget', 3],
    ['squadSize', 4],
    ['benchBoostBudget', 4],
    ['benchBoostSize', 5],
    ['currentGameweekId', 'gw1'],
    ['recommendHalfChange', true],
    ['leagueKey', key],
  ]);
}

function seedPlayers_() {
  writeRows_(SHEETS.players, [
    ['richi', 'Richi', 'ATK', 1.1, false, 9, true],
    ['nick', 'Nick', 'ATK', 0.8, false, 10, true],
    ['shane', 'Shane', 'MID', 0.9, false, 8, true],
    ['mario', 'Mario', 'MID', 0.8, false, 7, true],
    ['juan', 'Juan', 'MID', 0.7, false, 11, true],
    ['nico', 'Nico', 'MID', 0.7, false, 6, true],
    ['hiro', 'Hiro', 'MID', 0.6, false, 14, true],
    ['bryan', 'Bryan', 'MID', 0.5, false, 17, true],
    ['erwin', 'Erwin', 'DEF', 0.9, false, 4, true],
    ['julian', 'Julian', 'DEF', 0.7, false, 5, true],
    ['patrick', 'Patrick', 'DEF', 0.6, false, 3, true],
    ['ume', 'Ume', 'DEF', 0.5, false, 2, true],
    ['vidur', 'Vidur', 'GK', 0.5, false, 1, true],
    ['sub', 'Sub', 'SUB', 0.4, true, 99, true],
  ]);
}

function seedScoring_() {
  writeRows_(SHEETS.scoring, [
    ['GK', 6, 6, 4, 7, 0, 3],
    ['DEF', 5, 4, 6, 6, 4, 2],
    ['MID', 4, 3, 6, 3, 3, 2],
    ['ATK', 3, 3, 4, 2, 2, 2],
  ]);
}

function seedBonuses_() {
  writeRows_(SHEETS.bonuses, [
    ['yellow', -1, 'Yellow card'],
    ['red', -3, 'Red card'],
    ['missed_penalty', -2, 'Missing a penalty'],
    ['error_goal', -1, 'Losing a ball that ends in a goal'],
    ['motm', 3, 'Man of the match'],
    ['second_mvp', 2, 'Second place MVP'],
    ['recognition', 1, 'Any recognition point'],
    ['winning_goal', 2, 'Scoring the winning goal'],
    ['winning_dc', 2, 'Making a DC in a winning game'],
  ]);
}

function seedGameweeks_() {
  var now = new Date();
  var kickoff = daysFrom_(now, 7);
  writeRows_(SHEETS.gameweeks, [
    ['gw1', 1, 'Gameweek 1', 'TBD', kickoff, kickoff, 'upcoming', '', '', 'Home', 'Put kickoff in the deadline column. Picks stay open until that time. Paste the YouTube link in youtubeUrl when the film is ready.', ''],
  ]);
}

function seedMatchStatRows_(gameweekId) {
  ensureMatchStatRows_(gameweekId);
}

function addGameweek() {
  return addNextGameweek();
}

function addNextGameweek() {
  ensureSheets_();
  var created = createGameweek_();
  ensureMatchStatRowsForAllGameweeks_();
  formatAll_();
  refreshLiveTable_();

  var gwSheet = SpreadsheetApp.getActive().getSheetByName(SHEETS.gameweeks);
  SpreadsheetApp.getActive().setActiveSheet(gwSheet);
  var last = gwSheet.getLastRow();
  gwSheet.getRange(last, 4).activate();
  SpreadsheetApp.getActive().toast(
    created.id + ' added to Gameweeks, MatchStats, Config, and LiveTable. Fill opponent and deadline.'
  );
  return created;
}

function createGameweek_(details) {
  details = details || {};
  var gws = objects_(SHEETS.gameweeks);
  var max = gws.reduce(function (n, g) { return Math.max(n, Number(g.number) || 0); }, 0);
  var next = max + 1;
  var id = String(details.id || ('gw' + next));
  if (gws.some(function (g) { return String(g.id) === id; })) {
    throw new Error(id + ' already exists.');
  }
  var kickoff = details.kickoff || daysFrom_(new Date(), 7);
  appendRows_(SHEETS.gameweeks, [[
    id,
    details.number || next,
    details.name || ('Gameweek ' + next),
    details.opponent || 'TBD',
    kickoff,
    details.deadline || kickoff,
    details.status || 'upcoming',
    '',
    '',
    details.venue || 'Home',
    details.notes || '',
    details.youtubeUrl || '',
  ]]);
  ensureMatchStatRows_(id);
  setConfig_('currentGameweekId', id);
  return { id: id, number: next };
}

function ensureMatchStatRows_(gameweekId) {
  var players = objects_(SHEETS.players);
  var have = {};
  objects_(SHEETS.matchStats).forEach(function (s) {
    if (String(s.gameweekId) === String(gameweekId)) have[String(s.playerId)] = true;
  });
  var rows = players.filter(function (p) { return p.id && !have[String(p.id)]; }).map(function (p) {
    return [
      gameweekId, p.id, false, 0, 0, 0, 0, 0, 0, 0, 0, false, false, 0, false, '',
    ];
  });
  appendRows_(SHEETS.matchStats, rows);
  return rows.length;
}

function ensureMatchStatRowsForAllGameweeks_() {
  objects_(SHEETS.gameweeks).forEach(function (g) {
    if (g.id) ensureMatchStatRows_(g.id);
  });
}

function lockCurrentGameweek() {
  var id = getConfig_().currentGameweekId;
  setGameweekStatus_(id, 'locked');
}

function unlockCurrentGameweek() {
  var id = getConfig_().currentGameweekId;
  setGameweekStatus_(id, 'upcoming');
}

function setGameweekStatus_(id, status) {
  var sheet = SpreadsheetApp.getActive().getSheetByName(SHEETS.gameweeks);
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var idCol = headers.indexOf('id');
  var stCol = headers.indexOf('status');
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(id)) {
      sheet.getRange(i + 1, stCol + 1).setValue(status);
      refreshLiveTable_();
      SpreadsheetApp.getActive().toast(id + ' is now ' + status);
      return;
    }
  }
}

function recalculateStandings() {
  refreshLiveTable_();
  SpreadsheetApp.getActive().toast('Standings updated');
}

function refreshLiveTable_() {
  writeLiveTable_(buildBootstrap_());
}

function shouldRefreshLiveTable_(e) {
  if (!e || !e.range) return false;
  var range = e.range;
  var sheet = range.getSheet();
  var name = sheet.getName();
  var startRow = range.getRow();
  var numRows = range.getNumRows();
  var startCol = range.getColumn();
  var endCol = startCol + range.getNumColumns() - 1;
  if (startRow < 2) return false;

  if (name === SHEETS.gameweeks) {
    var headers = sheetHeaders_(sheet);
    var statusCol = headers.indexOf('status') + 1;
    var gfCol = headers.indexOf('goalsFor') + 1;
    var gaCol = headers.indexOf('goalsAgainst') + 1;
    var touchesStatus = statusCol > 0 && statusCol >= startCol && statusCol <= endCol;
    var touchesScore = (gfCol > 0 && gfCol >= startCol && gfCol <= endCol) ||
      (gaCol > 0 && gaCol >= startCol && gaCol <= endCol);
    if (!touchesStatus && !touchesScore) return false;

    var statuses = statusCol > 0
      ? sheet.getRange(startRow, statusCol, numRows, 1).getValues()
      : [];
    var oldStatus = numRows === 1 && e.oldValue != null ? String(e.oldValue).toLowerCase() : '';
    for (var i = 0; i < statuses.length; i++) {
      var status = String(statuses[i][0] || '').toLowerCase();
      if (status === 'finished' || status === 'live' || oldStatus === 'finished' || oldStatus === 'live') {
        return true;
      }
    }
    return false;
  }

  if (name === SHEETS.matchStats) {
    var statHeaders = sheetHeaders_(sheet);
    var gwCol = statHeaders.indexOf('gameweekId') + 1;
    if (gwCol < 1) return false;
    var gwIds = {};
    sheet.getRange(startRow, gwCol, numRows, 1).getValues().forEach(function (row) {
      var id = String(row[0] || '').trim();
      if (id) gwIds[id] = true;
    });
    if (!Object.keys(gwIds).length) return false;
    return objects_(SHEETS.gameweeks).some(function (g) {
      var status = String(g.status || '').toLowerCase();
      return gwIds[String(g.id)] && (status === 'finished' || status === 'live');
    });
  }

  return false;
}

function sheetHeaders_(sheet) {
  return sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0].map(function (h) {
    return String(h).trim();
  });
}

/* -------------------------------------------------------------------------- */
/* API                                                                        */
/* -------------------------------------------------------------------------- */

function readLeagueSheets_() {
  return {
    config: getConfig_(),
    players: objects_(SHEETS.players).map(normalizePlayer_),
    gameweeks: objects_(SHEETS.gameweeks).map(normalizeGameweek_),
    matchStats: objects_(SHEETS.matchStats).map(normalizeStat_),
    picks: objects_(SHEETS.picks).map(normalizePick_).filter(function (p) {
      return p.managerId && p.playerIds.length;
    }),
    scoring: objects_(SHEETS.scoring).map(normalizeScoring_),
    bonuses: objects_(SHEETS.bonuses).map(function (row) {
      return { event: String(row.event), points: num_(row.points), notes: String(row.notes || '') };
    }),
  };
}

function buildBootstrap_() {
  var sheets = readLeagueSheets_();
  return {
    ok: true,
    config: sheets.config,
    players: sheets.players,
    gameweeks: sheets.gameweeks,
    matchStats: sheets.matchStats,
    picks: sheets.picks,
    scoring: sheets.scoring,
    bonuses: sheets.bonuses,
    computed: computeAll_(
      sheets.players, sheets.gameweeks, sheets.matchStats, sheets.picks, sheets.scoring, sheets.bonuses
    ),
  };
}

function buildApiBootstrap_() {
  var sheets = readLeagueSheets_();
  return {
    ok: true,
    config: sheets.config,
    players: sheets.players,
    gameweeks: sheets.gameweeks,
    matchStats: sheets.matchStats,
    picks: sheets.picks,
    scoring: sheets.scoring,
    bonuses: sheets.bonuses,
  };
}

function savePicks_(body) {
  var config = getConfig_();
  var players = objects_(SHEETS.players).map(normalizePlayer_);
  var gameweeks = objects_(SHEETS.gameweeks).map(normalizeGameweek_);
  var picks = objects_(SHEETS.picks).map(normalizePick_).filter(function (p) {
    return p.managerId && p.playerIds.length;
  });
  var managerId = String(body.managerId || '');
  var gameweekId = String(body.gameweekId || '');
  var playerIds = (body.playerIds || []).map(function (id) { return String(id); }).filter(Boolean);
  var captainId = String(body.captainId || '');
  var chip = body.chip || 'none';
  var check = validatePicks_(
    managerId, gameweekId, playerIds, captainId, chip,
    players, gameweeks, picks, config
  );
  if (!check.ok) throw new Error(check.errors.join(' '));

  var sheet = SpreadsheetApp.getActive().getSheetByName(SHEETS.picks);
  var values = sheet.getDataRange().getValues();
  var headers = values[0];
  var gwCol = headers.indexOf('gameweekId');
  var mgrCol = headers.indexOf('managerId');
  var submittedAt = new Date();
  var replaced = false;
  for (var i = values.length - 1; i >= 1; i--) {
    if (String(values[i][gwCol]) === gameweekId && String(values[i][mgrCol]) === managerId) {
      sheet.getRange(i + 1, 1, 1, 10).setValues([[
        gameweekId, managerId,
        playerIds[0] || '', playerIds[1] || '', playerIds[2] || '',
        playerIds[3] || '', playerIds[4] || '',
        captainId, chip, submittedAt,
      ]]);
      replaced = true;
      break;
    }
  }
  if (!replaced) {
    sheet.appendRow([
      gameweekId, managerId,
      playerIds[0] || '', playerIds[1] || '', playerIds[2] || '',
      playerIds[3] || '', playerIds[4] || '',
      captainId, chip, submittedAt,
    ]);
  }
  return {
    ok: true,
    pick: {
      gameweekId: gameweekId,
      managerId: managerId,
      playerIds: playerIds,
      captainId: captainId,
      chip: chip,
      submittedAt: submittedAt.toISOString(),
    },
  };
}

function validatePicks_(managerId, gameweekId, playerIds, captainId, chip, players, gameweeks, picks, config) {
  var errors = [];
  var manager = find_(players, 'id', managerId);
  var gameweek = find_(gameweeks, 'id', gameweekId);
  if (!manager || manager.isSub) errors.push('Choose a Dark Team player to manage a squad.');
  if (!gameweek) errors.push('That gameweek does not exist.');
  if (gameweek && (gameweek.status === 'finished' || gameweek.status === 'locked')) {
    errors.push('Picks are locked for this gameweek.');
  }
  var lockAt = (gameweek && (gameweek.deadline || gameweek.kickoff)) || '';
  if (lockAt && new Date().getTime() > new Date(lockAt).getTime()) {
    errors.push('Kickoff has started. Squads are locked.');
  }

  var budget = chip === 'bench_boost' ? num_(config.benchBoostBudget) : num_(config.budget);
  var size = chip === 'bench_boost' ? num_(config.benchBoostSize) : num_(config.squadSize);
  var unique = unique_(playerIds);
  if (unique.length !== playerIds.length) errors.push('You cannot pick the same player twice.');
  if (unique.length !== size) errors.push('Select exactly ' + size + ' players.');

  var selected = unique.map(function (id) { return find_(players, 'id', id); });
  if (selected.some(function (p) { return !p; })) errors.push('One of the selected players is invalid.');
  var cost = selected.reduce(function (sum, p) { return sum + (p ? num_(p.price) : 0); }, 0);
  if (cost - budget > 0.001) errors.push('Squad is over budget.');
  if (manager && unique.indexOf(manager.id) !== -1) errors.push('You cannot pick yourself.');
  if (unique.indexOf(captainId) === -1) errors.push('Captain must be one of your selected players.');

  if (gameweek) {
    var previous = gameweeks
      .filter(function (g) { return num_(g.number) < num_(gameweek.number); })
      .sort(function (a, b) { return num_(b.number) - num_(a.number); })[0];
    if (previous) {
      var lastPick = picks.filter(function (p) {
        return p.managerId === managerId && p.gameweekId === previous.id;
      })[0];
      if (lastPick && lastPick.captainId === captainId) {
        errors.push('You cannot captain the same player two weeks in a row.');
      }
    }
  }

  if (chip !== 'none') {
    var used = picks.some(function (p) {
      return p.managerId === managerId && p.chip === chip && p.gameweekId !== gameweekId;
    });
    if (used) errors.push('That chip has already been used this season.');
  }

  return { ok: errors.length === 0, errors: errors };
}

/* -------------------------------------------------------------------------- */
/* Scoring                                                                    */
/* -------------------------------------------------------------------------- */

function computeAll_(players, gameweeks, matchStats, picks, scoring, bonuses) {
  var playerGameweekPoints = [];
  players.forEach(function (player) {
    gameweeks.forEach(function (gw) {
      var stats = matchStats.filter(function (s) {
        return s.gameweekId === gw.id && s.playerId === player.id;
      })[0];
      playerGameweekPoints.push(scorePlayerGameweek_(player, stats, gw, scoring, bonuses));
    });
  });

  var pointsMap = {};
  playerGameweekPoints.forEach(function (row) {
    pointsMap[row.gameweekId + ':' + row.playerId] = row;
  });

  var finishedIds = gameweeks.filter(function (g) { return g.status === 'finished'; }).map(function (g) { return g.id; });
  var lastThree = gameweeks.slice().sort(function (a, b) { return num_(a.number) - num_(b.number); }).slice(-3).map(function (g) { return g.id; });
  var gwById = {};
  gameweeks.forEach(function (g) { gwById[g.id] = g; });

  var playerSeason = players.map(function (player) {
    var rows = matchStats.filter(function (s) { return s.playerId === player.id; });
    var points = playerGameweekPoints
      .filter(function (r) { return r.playerId === player.id && finishedIds.indexOf(r.gameweekId) !== -1; })
      .reduce(function (sum, r) { return sum + r.points; }, 0);
    var form = playerGameweekPoints
      .filter(function (r) { return r.playerId === player.id && lastThree.indexOf(r.gameweekId) !== -1; })
      .reduce(function (sum, r) { return sum + r.points; }, 0);
    var cleanSheets = rows.filter(function (s) {
      var gw = gwById[s.gameweekId];
      return s.played && gw && gw.goalsAgainst === 0 && gw.goalsFor !== null;
    }).length;
    return {
      playerId: player.id,
      name: player.name,
      position: player.position,
      price: player.price,
      isSub: player.isSub,
      played: rows.filter(function (s) { return s.played; }).length,
      goals: sumField_(rows, 'goals'),
      assists: sumField_(rows, 'assists'),
      defCons: sumField_(rows, 'defCons'),
      cleanSheets: cleanSheets,
      yellowCards: sumField_(rows, 'yellowCards'),
      redCards: sumField_(rows, 'redCards'),
      motm: rows.filter(function (s) { return s.motm; }).length,
      points: points,
      form: form,
    };
  });

  var current = gameweeks.filter(function (g) { return g.status === 'live'; })[0] ||
    gameweeks.filter(function (g) { return g.status === 'finished'; }).sort(function (a, b) { return num_(b.number) - num_(a.number); })[0] ||
    gameweeks[0];
  var previous = current
    ? gameweeks.filter(function (g) { return num_(g.number) < num_(current.number) && g.status === 'finished'; })
      .sort(function (a, b) { return num_(b.number) - num_(a.number); })[0]
    : null;

  var managers = players.filter(function (p) { return !p.isSub && p.active; });
  var playerById = {};
  players.forEach(function (p) { playerById[p.id] = p; });

  function fantasyScore(pick) {
    return pick.playerIds.reduce(function (sum, playerId) {
      var row = pointsMap[pick.gameweekId + ':' + playerId];
      var pts = row ? row.points : 0;
      var multi = playerId === pick.captainId ? (pick.chip === 'triple_captain' ? 3 : 2) : 1;
      return sum + pts * multi;
    }, 0);
  }

  var fantasyStandings = managers.map(function (manager) {
    var mine = picks.filter(function (p) { return p.managerId === manager.id; });
    var totalPoints = mine
      .filter(function (p) { return finishedIds.indexOf(p.gameweekId) !== -1; })
      .reduce(function (sum, p) { return sum + fantasyScore(p); }, 0);
    var currentPick = current ? mine.filter(function (p) { return p.gameweekId === current.id; })[0] : null;
    var previousPick = previous ? mine.filter(function (p) { return p.gameweekId === previous.id; })[0] : null;
    var teamValue = (currentPick ? currentPick.playerIds : []).reduce(function (sum, id) {
      return sum + (playerById[id] ? num_(playerById[id].price) : 0);
    }, 0);
    return {
      managerId: manager.id,
      name: manager.name,
      position: manager.position,
      gameweekPoints: currentPick ? fantasyScore(currentPick) : 0,
      totalPoints: totalPoints,
      lastGameweekPoints: previousPick ? fantasyScore(previousPick) : 0,
      chipsUsed: mine.filter(function (p) { return p.chip && p.chip !== 'none'; }).map(function (p) { return p.chip; }),
      teamValue: Number(teamValue.toFixed(2)),
      picked: Boolean(currentPick),
    };
  }).sort(function (a, b) {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (b.gameweekPoints !== a.gameweekPoints) return b.gameweekPoints - a.gameweekPoints;
    return a.name < b.name ? -1 : 1;
  });

  return {
    playerGameweekPoints: playerGameweekPoints,
    playerSeason: playerSeason,
    fantasyStandings: fantasyStandings,
  };
}

function scorePlayerGameweek_(player, stats, gameweek, scoring, bonuses) {
  var empty = { playerId: player.id, gameweekId: gameweek.id, points: 0, breakdown: [] };
  if (!stats || !stats.played) return empty;
  var rule = find_(scoring, 'position', player.position) || find_(scoring, 'position', 'MID');
  if (!rule) return empty;
  var bonusMap = {};
  bonuses.forEach(function (b) { bonusMap[b.event] = num_(b.points); });

  var points = 0;
  var breakdown = [];
  function add(label, value) {
    if (!value) return;
    points += value;
    breakdown.push({ label: label, value: value });
  }

  add('Goals', num_(stats.goals) * num_(rule.goalPts));
  add('Assists', num_(stats.assists) * num_(rule.assistPts));
  add('Defensive contributions', Math.floor(num_(stats.defCons) / Math.max(num_(rule.dcPerPoint), 1)));
  add('In-field goals', num_(stats.inFieldGoals) * num_(rule.inFieldGoalBonus));

  var teamReady = gameweek.goalsFor !== null && gameweek.goalsAgainst !== null;
  if (teamReady) {
    var gf = num_(gameweek.goalsFor);
    var ga = num_(gameweek.goalsAgainst);
    if (ga === 0) add('Clean sheet', num_(rule.cleanSheetPts));
    if (ga > 0) add('Goals conceded', -Math.floor(ga / Math.max(num_(rule.concedePerMinus), 1)));
    var won = gf > ga;
    var winningDc = stats.winningDc === null ? (won && num_(stats.defCons) > 0) : stats.winningDc;
    if (winningDc) add('Winning-game DC', bonusMap.winning_dc != null ? bonusMap.winning_dc : 2);
  }

  add('Yellow card', num_(stats.yellowCards) * (bonusMap.yellow != null ? bonusMap.yellow : -1));
  add('Red card', num_(stats.redCards) * (bonusMap.red != null ? bonusMap.red : -3));
  add('Missed penalty', num_(stats.missedPenalties) * (bonusMap.missed_penalty != null ? bonusMap.missed_penalty : -2));
  add('Error leading to goal', num_(stats.errorsLedToGoal) * (bonusMap.error_goal != null ? bonusMap.error_goal : -1));
  if (stats.motm) add('Man of the match', bonusMap.motm != null ? bonusMap.motm : 3);
  if (stats.secondMvp) add('Second MVP', bonusMap.second_mvp != null ? bonusMap.second_mvp : 2);
  add('Recognition', num_(stats.recognitionPoints) * (bonusMap.recognition != null ? bonusMap.recognition : 1));
  if (stats.winningGoal) add('Winning goal', bonusMap.winning_goal != null ? bonusMap.winning_goal : 2);

  return { playerId: player.id, gameweekId: gameweek.id, points: points, breakdown: breakdown };
}

function writeLiveTable_(bootstrap) {
  var sheet = SpreadsheetApp.getActive().getSheetByName(SHEETS.live);
  sheet.clear();
  sheet.getRange(1, 1, 1, 7).setValues([['kind', 'rank', 'id', 'name', 'detail', 'gwPoints', 'totalPoints']]);
  var rows = [];
  bootstrap.computed.fantasyStandings.forEach(function (row, i) {
    rows.push(['fantasy', i + 1, row.managerId, row.name, 'chips: ' + (row.chipsUsed.join(',') || 'none'), row.gameweekPoints, row.totalPoints]);
  });
  var players = bootstrap.computed.playerSeason.slice().sort(function (a, b) { return b.points - a.points; });
  players.forEach(function (row, i) {
    rows.push(['player', i + 1, row.playerId, row.name, row.position, row.form, row.points]);
  });
  if (rows.length) sheet.getRange(2, 1, rows.length, 7).setValues(rows);
  sheet.setFrozenRows(1);
}

/* -------------------------------------------------------------------------- */
/* Normalizers                                                                */
/* -------------------------------------------------------------------------- */

function getConfig_() {
  var map = {};
  objects_(SHEETS.config).forEach(function (row) { map[row.key] = row.value; });
  return {
    leagueName: String(map.leagueName || 'Dark Team Fantasy'),
    seasonName: String(map.seasonName || ''),
    budget: num_(map.budget || 3),
    squadSize: num_(map.squadSize || 4),
    benchBoostBudget: num_(map.benchBoostBudget || 4),
    benchBoostSize: num_(map.benchBoostSize || 5),
    currentGameweekId: String(map.currentGameweekId || ''),
    recommendHalfChange: truthy_(map.recommendHalfChange),
    leagueKey: String(map.leagueKey || PropertiesService.getDocumentProperties().getProperty('LEAGUE_KEY') || ''),
  };
}

function setConfig_(key, value) {
  var sheet = SpreadsheetApp.getActive().getSheetByName(SHEETS.config);
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === key) {
      sheet.getRange(i + 1, 2).setValue(value);
      return;
    }
  }
  sheet.appendRow([key, value]);
}

function normalizePlayer_(row) {
  return {
    id: String(row.id),
    name: String(row.name),
    position: String(row.position || 'MID').toUpperCase(),
    price: num_(row.price),
    isSub: truthy_(row.isSub),
    shirt: num_(row.shirt),
    active: row.active === '' ? true : truthy_(row.active),
  };
}

function normalizeGameweek_(row) {
  return {
    id: String(row.id),
    number: num_(row.number),
    name: String(row.name || 'Gameweek ' + row.number),
    opponent: String(row.opponent || ''),
    kickoff: toIso_(row.kickoff),
    deadline: toIso_(row.deadline || row.kickoff),
    status: String(row.status || 'upcoming').toLowerCase(),
    goalsFor: blank_(row.goalsFor) ? null : num_(row.goalsFor),
    goalsAgainst: blank_(row.goalsAgainst) ? null : num_(row.goalsAgainst),
    venue: String(row.venue || ''),
    notes: String(row.notes || ''),
    youtubeUrl: String(row.youtubeUrl || '').trim(),
  };
}

function normalizeStat_(row) {
  var winningDc = String(row.winningDc || '').trim();
  return {
    gameweekId: String(row.gameweekId),
    playerId: String(row.playerId),
    played: truthy_(row.played),
    goals: num_(row.goals),
    assists: num_(row.assists),
    defCons: num_(row.defCons),
    inFieldGoals: num_(row.inFieldGoals),
    yellowCards: num_(row.yellowCards),
    redCards: num_(row.redCards),
    missedPenalties: num_(row.missedPenalties),
    errorsLedToGoal: num_(row.errorsLedToGoal),
    motm: truthy_(row.motm),
    secondMvp: truthy_(row.secondMvp),
    recognitionPoints: num_(row.recognitionPoints),
    winningGoal: truthy_(row.winningGoal),
    winningDc: winningDc === '' ? null : truthy_(row.winningDc),
  };
}

function normalizePick_(row) {
  var ids = [row.player1, row.player2, row.player3, row.player4, row.player5]
    .map(function (id) { return String(id || '').trim(); })
    .filter(Boolean);
  return {
    gameweekId: String(row.gameweekId),
    managerId: String(row.managerId),
    playerIds: ids,
    captainId: String(row.captainId || ''),
    chip: String(row.chip || 'none'),
    submittedAt: toIso_(row.submittedAt),
  };
}

function normalizeScoring_(row) {
  return {
    position: String(row.position).toUpperCase(),
    goalPts: num_(row.goalPts),
    assistPts: num_(row.assistPts),
    dcPerPoint: num_(row.dcPerPoint),
    cleanSheetPts: num_(row.cleanSheetPts),
    inFieldGoalBonus: num_(row.inFieldGoalBonus),
    concedePerMinus: num_(row.concedePerMinus),
  };
}

/* -------------------------------------------------------------------------- */
/* Formatting + instructions                                                  */
/* -------------------------------------------------------------------------- */

function formatAll_() {
  var ss = SpreadsheetApp.getActive();
  var header = { background: '#111318', fontColor: '#D8F830', fontWeight: 'bold' };
  Object.keys(SHEETS).forEach(function (k) {
    var sheet = ss.getSheetByName(SHEETS[k]);
    if (!sheet.getLastColumn()) return;
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, sheet.getLastColumn()).setFontWeight(header.fontWeight)
      .setBackground(header.background).setFontColor(header.fontColor);
    sheet.setTabColor('#111318');
  });

  var players = ss.getSheetByName(SHEETS.players);
  var last = players.getLastRow();
  if (last > 1) {
    var posCol = 3;
    for (var i = 2; i <= last; i++) {
      var pos = String(players.getRange(i, posCol).getValue()).toUpperCase();
      var color = '#1C2430';
      if (pos === 'ATK') color = '#4A2030';
      if (pos === 'MID') color = '#1A3050';
      if (pos === 'DEF') color = '#16382A';
      if (pos === 'GK') color = '#3A2E12';
      players.getRange(i, 1, 1, 7).setBackground(color).setFontColor('#F4F7FB');
    }
  }

  var gw = ss.getSheetByName(SHEETS.gameweeks);
  var statusRange = gw.getRange('G2:G200');
  var rule = SpreadsheetApp.newDataValidation().requireValueInList(['upcoming', 'live', 'finished', 'locked'], true).build();
  statusRange.setDataValidation(rule);

  var chipRange = ss.getSheetByName(SHEETS.picks).getRange('I2:I500');
  chipRange.setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(['none', 'triple_captain', 'bench_boost'], true).build()
  );

  var posRange = ss.getSheetByName(SHEETS.players).getRange('C2:C50');
  posRange.setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(['GK', 'DEF', 'MID', 'ATK', 'SUB'], true).build()
  );

  var stats = ss.getSheetByName(SHEETS.matchStats);
  var checkbox = SpreadsheetApp.newDataValidation().requireCheckbox().build();
  ['C', 'L', 'M', 'O'].forEach(function (col) {
    stats.getRange(col + '2:' + col + '500').setDataValidation(checkbox);
  });
}

function writeInstructions_() {
  var sheet = SpreadsheetApp.getActive().getSheetByName(SHEETS.instructions);
  sheet.clear();
  var key = getConfig_().leagueKey;
  var lines = [
    ['DARK TEAM FANTASY'],
    [''],
    ['How the league runs'],
    ['1. After a match, open Gameweeks and fill opponent, goalsFor, goalsAgainst.'],
    ['2. Open MatchStats. For every player who played, set played=TRUE and enter goals, assists, defCons, cards, MOTM, etc.'],
    ['3. Set the gameweek status to finished. LiveTable updates automatically from those MatchStats.'],
    ['4. Dark Team > Recalculate standings is only needed if you want to force a refresh.'],
    ['5. Before the next match: Dark Team > Add next gameweek (or run addGameweek). That creates the Gameweeks row,'],
    ['   one MatchStats row per player, sets Config currentGameweekId, and refreshes LiveTable.'],
    ['   Then put the kickoff time in the deadline column — picks stay editable until then.'],
    ['6. When the match film is ready, paste the YouTube URL into Gameweeks!youtubeUrl. Until then the app shows Coming soon.'],
    [''],
    ['Picks'],
    ['The iPhone app writes squads with doPost into the Picks sheet. Players can update until kickoff (deadline).'],
    ['Rules enforced by the API: $3 budget / 4 players (or $4 / 5 with Bench Boost), cannot pick yourself,'],
    ['one captain, captain cannot repeat week-to-week, each chip once per season, lock at kickoff.'],
    [''],
    ['Scoring notes'],
    ['DC points = floor(defCons / DC per point). In-field goal is a bonus on top of regular goal points.'],
    ['Clean sheet and goals-conceded penalties apply only after goalsFor and goalsAgainst are filled.'],
    ['winningDc blank = auto award +2 if Dark Team won and the player recorded at least 1 DC.'],
    [''],
    ['Deploy the API'],
    ['Extensions > Apps Script > Deploy > New deployment > Web app.'],
    ['Execute as: Me. Who has access: Anyone.'],
    ['Paste the /exec URL into the app, plus this League Key:'],
    [key],
    [''],
    ['Sub'],
    ['Use the Sub player when an external guest plays. Sub cannot log into the app as a manager.'],
  ];
  sheet.getRange(1, 1, lines.length, 1).setValues(lines);
  sheet.getRange(1, 1).setFontSize(22).setFontWeight('bold').setFontColor('#D8F830');
  sheet.setColumnWidth(1, 980);
  sheet.setTabColor('#D8F830');
  SpreadsheetApp.getActive().setActiveSheet(sheet);
}

/* -------------------------------------------------------------------------- */
/* Sheet helpers                                                              */
/* -------------------------------------------------------------------------- */

function objects_(name) {
  var sheet = SpreadsheetApp.getActive().getSheetByName(name);
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  var headers = values[0].map(function (h) { return String(h).trim(); });
  var rows = [];
  for (var i = 1; i < values.length; i++) {
    if (values[i].every(function (cell) { return cell === ''; })) continue;
    var obj = {};
    headers.forEach(function (h, idx) { obj[h] = values[i][idx]; });
    rows.push(obj);
  }
  return rows;
}

function writeRows_(name, rows) {
  var sheet = SpreadsheetApp.getActive().getSheetByName(name);
  if (sheet.getLastRow() > 1) sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
  if (!rows.length) return;
  sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
}

function appendRows_(name, rows) {
  if (!rows.length) return;
  var sheet = SpreadsheetApp.getActive().getSheetByName(name);
  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
}

function num_(value) {
  var n = Number(value);
  return isFinite(n) ? n : 0;
}

function truthy_(value) {
  if (value === true) return true;
  var s = String(value || '').trim().toLowerCase();
  return s === 'true' || s === 'yes' || s === '1' || s === 'x';
}

function blank_(value) {
  return value === '' || value === null || typeof value === 'undefined';
}

function toIso_(value) {
  if (!value) return '';
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return value.toISOString();
  }
  var d = new Date(value);
  return isNaN(d.getTime()) ? String(value) : d.toISOString();
}

function daysFrom_(base, days) {
  var d = new Date(base.getTime());
  d.setDate(d.getDate() + days);
  d.setHours(20, 0, 0, 0);
  return d;
}

function randomKey_() {
  var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  var out = '';
  for (var i = 0; i < 8; i++) out += chars.charAt(Math.floor(Math.random() * chars.length));
  return out;
}

function find_(list, key, value) {
  for (var i = 0; i < list.length; i++) {
    if (String(list[i][key]) === String(value)) return list[i];
  }
  return null;
}

function unique_(list) {
  var seen = {};
  var out = [];
  list.forEach(function (item) {
    if (!seen[item]) {
      seen[item] = true;
      out.push(item);
    }
  });
  return out;
}

function sumField_(rows, field) {
  return rows.reduce(function (sum, row) { return sum + num_(row[field]); }, 0);
}
