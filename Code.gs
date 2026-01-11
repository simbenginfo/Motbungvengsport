var SPREADSHEET_ID = "1RDnDJ5tMaxpcHdIYTlJOs7AbkZEmUlAGYEXeoxvu5dI";

// IMPORTANT: Left empty so the script creates a folder in YOUR Drive named "Motbung_Player_Images" automatically.
var PLAYER_IMAGE_FOLDER_ID = ""; 

var SHEETS = {
  ADMINS: "Admins",
  TOURNAMENTS: "Tournaments",
  TEAMS: "Teams",
  CATEGORIES: "Categories",
  MATCHES: "Matches",
  PLAYERS: "Players",
  STANDINGS: "Standings",
  BLOGS: "Blogs",
  RULES: "Rules"
};

function authorizeScript() {
  var folder = DriveApp.getRootFolder();
  var file = folder.createFile("temp_auth_check.txt", "Auth Check");
  file.setTrashed(true);
  console.log("Script is fully authorized for Read/Write access to Drive.");
}

function doOptions(e) {
  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.TEXT)
    .append(""); 
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({ 
    status: "online", 
    message: "Motbung Veng API is running." 
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  var hasLock = lock.tryLock(30000); 

  if (!hasLock) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: "Server is busy. Please try again."
    })).setMimeType(ContentService.MimeType.JSON);
  }

  try {
    var contents = (e && e.postData && e.postData.contents) ? e.postData.contents : "{}";
    var data = JSON.parse(contents);
    var action = data.action;
    var result = { success: false, message: "Invalid action" };

    switch (action) {
      // AUTH
      case "login": result = adminLogin(data.email, data.password); break;
      case "logout": result = adminLogout(); break;
      case "createAdmin": result = createAdmin(data.name, data.email, data.password); break;
      case "getAdmins": result = getAdmins(); break;
      case "changePassword": result = changePassword(data.email, data.oldPassword, data.newPassword); break;
      case "deleteAdmin": result = deleteAdmin(data.email); break;

      // TOURNAMENTS
      case "getTournaments": result = getTournaments(); break;
      case "createTournament": result = createTournament(data); break;
      case "deleteTournament": result = deleteTournament(data.tournamentId); break;

      // TEAMS
      case "getTeams": result = getTeams(data); break;
      case "createTeam": result = createTeam(data); break;
      case "deleteTeam": result = deleteTeam(data.teamId); break;

      // MATCHES (New Logic)
      case "createMatch": result = createMatch(data); break;
      case "getMatches": result = getMatches(data); break;
      case "updateMatch": result = updateMatch(data); break;
      case "deleteMatch": result = deleteMatch(data.matchId); break;

      // PLAYERS
      case "getPlayers": result = getPlayers(data); break;
      case "createPlayer": result = createPlayer(data); break;
      case "updatePlayer": result = updatePlayer(data); break;
      case "deletePlayer": result = deletePlayer(data.playerId); break;

      // STANDINGS
      case "getStandings": result = getStandings(); break;
      case "upsertStanding": result = upsertStanding(data.data); break;
      case "deleteStanding": result = deleteStanding(data.teamId, data.category); break;

      // BLOGS
      case "getBlogPosts": result = getBlogPosts(); break;
      case "upsertBlogPost": result = upsertBlogPost(data.data); break;
      case "deleteBlogPost": result = deleteBlogPost(data.id); break;

      // RULES
      case "getRules": result = getRules(); break;
      case "saveRules": result = saveRules(data.football, data.volleyball); break;
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: "Server Error: " + err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    if (hasLock) lock.releaseLock();
  }
}

/* --- AUTH --- */
function adminLogin(email, password) {
  var sheet = getSheet(SHEETS.ADMINS);
  var data = sheet.getDataRange().getValues();
  var defaultEmail = "admin@motbung.com";
  
  if (data.length <= 1) {
     sheet.appendRow(["A_RECOVERY", "Super Admin", defaultEmail, "admin123", true, new Date()]);
     data = sheet.getDataRange().getValues();
  } else {
     var hasDefault = false;
     for(var j=1; j<data.length; j++) {
        if(String(data[j][2]) === defaultEmail) hasDefault = true;
     }
     if(!hasDefault) {
        sheet.appendRow(["A_RECOVERY", "Super Admin", defaultEmail, "admin123", true, new Date()]);
        data = sheet.getDataRange().getValues();
     }
  }

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][2]).trim() == String(email).trim() && String(data[i][3]).trim() == String(password).trim()) {
      PropertiesService.getUserProperties().setProperty("loggedInAdmin", email);
      return { success: true, email: email, name: data[i][1], mustChangePassword: data[i][4] === true || String(data[i][4]) === "true" };
    }
  }
  return { success: false, message: "Invalid credentials" };
}

function adminLogout() {
  PropertiesService.getUserProperties().deleteProperty("loggedInAdmin");
  return { success: true, message: "Logged out" };
}

function isAdminLoggedIn() {
  var email = PropertiesService.getUserProperties().getProperty("loggedInAdmin");
  return email !== null && email !== "";
}

function createAdmin(name, email, password) {
  if (!isAdminLoggedIn()) return { success: false, message: "Unauthorized" };
  var sheet = getSheet(SHEETS.ADMINS);
  sheet.appendRow(["A" + Date.now(), name, email, password, true, new Date()]);
  return { success: true, message: "Admin created" };
}

function getAdmins() {
  if (!isAdminLoggedIn()) return { success: false, message: "Unauthorized" };
  var sheet = getSheet(SHEETS.ADMINS);
  var data = sheet.getDataRange().getValues();
  var admins = [];
  for (var i = 1; i < data.length; i++) {
    admins.push({ adminId: data[i][0], name: data[i][1], email: data[i][2], mustChangePassword: data[i][4], createdAt: data[i][5] });
  }
  return { success: true, admins: admins };
}

function changePassword(email, oldPw, newPw) {
  var sheet = getSheet(SHEETS.ADMINS);
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][2] == email && data[i][3] == oldPw) {
      sheet.getRange(i + 1, 4).setValue(newPw);
      sheet.getRange(i + 1, 5).setValue(false);
      return { success: true, message: "Password updated" };
    }
  }
  return { success: false, message: "Old password incorrect" };
}

function deleteAdmin(email) {
  if (!isAdminLoggedIn()) return { success: false, message: "Unauthorized" };
  return deleteRowByColumn(SHEETS.ADMINS, 2, email); // Col 2 is Email
}

/* --- TOURNAMENTS --- */
function createTournament(data) {
  if (!isAdminLoggedIn()) return { success: false, message: "Unauthorized" };
  var sheet = getSheet(SHEETS.TOURNAMENTS);
  var id = "trn_" + Date.now();
  sheet.appendRow([id, data.tournamentName, data.sport, data.categoryId, data.categoryName]);
  return { success: true, tournamentId: id };
}

function getTournaments() {
  var sheet = getSheet(SHEETS.TOURNAMENTS);
  if (!sheet) return { success: true, tournaments: [] };
  var data = sheet.getDataRange().getValues();
  var list = [];
  for (var i = 1; i < data.length; i++) {
    list.push({ tournamentId: data[i][0], tournamentName: data[i][1], sport: data[i][2], categoryId: data[i][3], categoryName: data[i][4] });
  }
  return { success: true, tournaments: list };
}

function deleteTournament(id) {
  if (!isAdminLoggedIn()) return { success: false, message: "Unauthorized" };
  return deleteRowById(SHEETS.TOURNAMENTS, id);
}

/* --- TEAMS --- */
function createTeam(data) {
  if (!isAdminLoggedIn()) return { success: false, message: "Unauthorized" };
  var sheet = getSheet(SHEETS.TEAMS);
  var id = "team_" + Date.now();
  sheet.appendRow([id, data.teamName, data.tournamentId, "", data.sport, data.categoryId, data.categoryName]);
  return { success: true, teamId: id };
}

function getTeams(filters) {
  var sheet = getSheet(SHEETS.TEAMS);
  if (!sheet) return { success: true, teams: [] };
  var data = sheet.getDataRange().getValues();
  var list = [];
  for (var i = 1; i < data.length; i++) {
    list.push({ teamId: data[i][0], teamName: data[i][1], tournamentId: data[i][2], sport: data[i][4], categoryId: data[i][5], categoryName: data[i][6] });
  }
  return { success: true, teams: list };
}

function deleteTeam(id) {
  if (!isAdminLoggedIn()) return { success: false, message: "Unauthorized" };
  return deleteRowById(SHEETS.TEAMS, id);
}

/* --- MATCHES (NEW) --- */
function createMatch(data) {
  if (!isAdminLoggedIn()) return { success: false, message: "Unauthorized" };
  if (!data.teamAId || !data.teamBId || !data.matchDate) return { success: false, message: "Missing required fields" };

  var sheet = getSheet(SHEETS.MATCHES);
  var adminEmail = PropertiesService.getUserProperties().getProperty("loggedInAdmin");
  var matchId = "match_" + Date.now();

  // Columns: matchId, tournId, tournName, sport, catId, catName, teamAId, teamAName, teamBId, teamBName, matchDate, matchTime, venue, scoreA, scoreB, status, createdBy, createdAt
  sheet.appendRow([
    matchId,
    data.tournamentId,
    data.tournamentName,
    data.sport,
    data.categoryId,
    data.categoryName,
    data.teamAId,
    data.teamAName,
    data.teamBId,
    data.teamBName,
    new Date(data.matchDate),
    data.matchTime || "",
    data.venue || "",
    "", // teamAScore
    "", // teamBScore
    "Upcoming",
    adminEmail,
    new Date()
  ]);

  return { success: true, message: "Match created", matchId: matchId };
}

function getMatches(filters) {
  var sheet = getSheet(SHEETS.MATCHES);
  var rows = sheet.getDataRange().getValues();
  var matches = [];

  // Start at i=1 to skip header
  for (var i = 1; i < rows.length; i++) {
    // Optional filtering logic if needed in future
    matches.push({
        matchId: rows[i][0],
        tournamentId: rows[i][1],
        tournamentName: rows[i][2],
        sport: rows[i][3],
        categoryId: rows[i][4],
        categoryName: rows[i][5],
        teamA: { id: rows[i][6], name: rows[i][7], score: rows[i][13] },
        teamB: { id: rows[i][8], name: rows[i][9], score: rows[i][14] },
        matchDate: rows[i][10],
        matchTime: rows[i][11],
        venue: rows[i][12],
        status: rows[i][15]
    });
  }
  return { success: true, matches: matches };
}

function updateMatch(data) {
  if (!isAdminLoggedIn()) return { success: false, message: "Unauthorized" };
  
  var sheet = getSheet(SHEETS.MATCHES);
  var rows = sheet.getDataRange().getValues();

  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] === data.matchId) {
      // Update fields based on what's passed
      if (data.matchDate) sheet.getRange(i + 1, 11).setValue(new Date(data.matchDate));
      if (data.matchTime) sheet.getRange(i + 1, 12).setValue(data.matchTime);
      if (data.venue) sheet.getRange(i + 1, 13).setValue(data.venue);

      if (data.teamAScore !== undefined) sheet.getRange(i + 1, 14).setValue(data.teamAScore);
      if (data.teamBScore !== undefined) sheet.getRange(i + 1, 15).setValue(data.teamBScore);
      if (data.status) sheet.getRange(i + 1, 16).setValue(data.status);

      return { success: true, message: "Match updated" };
    }
  }
  return { success: false, message: "Match not found" };
}

function deleteMatch(matchId) {
  if (!isAdminLoggedIn()) return { success: false, message: "Unauthorized" };
  return deleteRowById(SHEETS.MATCHES, matchId);
}

/* --- PLAYERS --- */
function createPlayer(data) {
  if (!isAdminLoggedIn()) return { success: false, message: "Unauthorized" };
  var sheet = getSheet(SHEETS.PLAYERS);
  var playerId = "pl_" + Date.now();
  var adminEmail = PropertiesService.getUserProperties().getProperty("loggedInAdmin") || "unknown";

  var photoUrl = "";
  if (data.imageBase64 && data.imageBase64.length > 100) {
    photoUrl = savePlayerImage(data.imageBase64, playerId);
    if (photoUrl.indexOf("Error") === 0) return { success: false, message: photoUrl };
  } else {
    photoUrl = (data.photoUrl && data.photoUrl.startsWith("http")) ? data.photoUrl : "";
  }

  sheet.appendRow([playerId, data.playerName, data.fatherName || "", data.jerseyNo || "", data.teamId, data.teamName || "", data.tournamentId || "", data.sport || "", data.categoryId || "", data.categoryName || "", photoUrl, adminEmail, new Date()]);
  return { success: true, message: "Player created", playerId: playerId };
}

function getPlayers(filters) {
  var sheet = getSheet(SHEETS.PLAYERS);
  var rows = sheet.getDataRange().getValues();
  var players = [];
  for (var i = 1; i < rows.length; i++) {
    players.push({
      playerId: rows[i][0],
      playerName: rows[i][1],
      fatherName: rows[i][2],
      jerseyNo: rows[i][3],
      teamId: rows[i][4],
      teamName: rows[i][5],
      tournamentId: rows[i][6],
      sport: rows[i][7],
      categoryId: rows[i][8],
      categoryName: rows[i][9],
      photoUrl: rows[i][10]
    });
  }
  return { success: true, players: players };
}

function updatePlayer(data) {
  if (!isAdminLoggedIn()) return { success: false, message: "Unauthorized" };
  var sheet = getSheet(SHEETS.PLAYERS);
  var rows = sheet.getDataRange().getValues();

  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] === data.playerId) {
      if(data.playerName) sheet.getRange(i + 1, 2).setValue(data.playerName);
      if(data.fatherName) sheet.getRange(i + 1, 3).setValue(data.fatherName);
      if(data.jerseyNo) sheet.getRange(i + 1, 4).setValue(data.jerseyNo);
      if (data.imageBase64 && data.imageBase64.length > 100) {
        var newPhoto = savePlayerImage(data.imageBase64, data.playerId);
        if (newPhoto.indexOf("Error") === 0) return { success: false, message: newPhoto };
        sheet.getRange(i + 1, 11).setValue(newPhoto);
      }
      return { success: true, message: "Player updated" };
    }
  }
  return { success: false, message: "Player not found" };
}

function deletePlayer(playerId) {
  if (!isAdminLoggedIn()) return { success: false, message: "Unauthorized" };
  return deleteRowById(SHEETS.PLAYERS, playerId);
}

function getOrCreateFolder() {
    var folderName = "Motbung_Player_Images";
    var folders = DriveApp.getFoldersByName(folderName);
    var folder;
    if (folders.hasNext()) folder = folders.next();
    else folder = DriveApp.createFolder(folderName);
    
    try { folder.setSharing(DriveApp.Access.ANYONE, DriveApp.Permission.VIEW); } 
    catch(e) { try { folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch(e2) {} }
    return folder;
}

function savePlayerImage(base64Data, playerId) {
  try {
    var folder;
    try {
        if (PLAYER_IMAGE_FOLDER_ID && PLAYER_IMAGE_FOLDER_ID !== "") folder = DriveApp.getFolderById(PLAYER_IMAGE_FOLDER_ID);
        else throw new Error("No ID");
    } catch(e) { folder = getOrCreateFolder(); }

    var split = base64Data.split(',');
    if (split.length < 2) return "Error: Invalid Base64"; 
    var type = split[0].split(':')[1].split(';')[0];
    var bytes = Utilities.base64Decode(split[1]);
    var ext = type.includes("png") ? "png" : "jpg";

    var blob = Utilities.newBlob(bytes, type, playerId + "." + ext);
    var existing = folder.getFilesByName(playerId + "." + ext);
    while (existing.hasNext()) existing.next().setTrashed(true);
    
    var file = folder.createFile(blob);
    try { file.setSharing(DriveApp.Access.ANYONE, DriveApp.Permission.VIEW); } catch(e) { try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e2) {} }
    
    return "https://lh3.googleusercontent.com/d/" + file.getId();
  } catch(e) {
    var msg = e.toString();
    if (msg.includes("permission") || msg.includes("authorization")) return "Error: Script needs Authorization.";
    return "Error Uploading: " + msg;
  }
}

/* --- STANDINGS --- */
function getStandings() {
  var sheet = getSheet(SHEETS.STANDINGS);
  if (!sheet) return { success: true, standings: [] };
  var data = sheet.getDataRange().getValues();
  var list = [];
  for (var i = 1; i < data.length; i++) {
    list.push({ teamId: data[i][0], played: data[i][1], won: data[i][2], drawn: data[i][3], lost: data[i][4], points: data[i][5], category: data[i][6] });
  }
  return { success: true, standings: list };
}

function upsertStanding(s) {
  if (!isAdminLoggedIn()) return { success: false, message: "Unauthorized" };
  var sheet = getSheet(SHEETS.STANDINGS);
  var data = sheet.getDataRange().getValues();
  var found = false;
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == s.teamId && data[i][6] == s.category) {
      sheet.getRange(i + 1, 1, 1, 7).setValues([[s.teamId, s.played, s.won, s.drawn, s.lost, s.points, s.category]]);
      found = true;
      break;
    }
  }
  if (!found) sheet.appendRow([s.teamId, s.played, s.won, s.drawn, s.lost, s.points, s.category]);
  return { success: true, message: "Saved" };
}

function deleteStanding(teamId, category) {
  if (!isAdminLoggedIn()) return { success: false, message: "Unauthorized" };
  var sheet = getSheet(SHEETS.STANDINGS);
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == teamId && data[i][6] == category) {
      sheet.deleteRow(i + 1);
      return { success: true, message: "Deleted" };
    }
  }
  return { success: false, message: "Not found" };
}

/* --- BLOGS & RULES (UNCHANGED) --- */
function getBlogPosts() {
  var sheet = getSheet(SHEETS.BLOGS);
  if (!sheet) return { success: true, blogs: [] };
  var data = sheet.getDataRange().getValues();
  var list = [];
  for (var i = 1; i < data.length; i++) {
    list.push({ id: data[i][0], title: data[i][1], summary: data[i][2], date: data[i][3], author: data[i][4], image: data[i][5] });
  }
  return { success: true, blogs: list };
}

function upsertBlogPost(b) {
  if (!isAdminLoggedIn()) return { success: false, message: "Unauthorized" };
  var sheet = getSheet(SHEETS.BLOGS);
  return upsertRow(sheet, b.id, [b.id, b.title, b.summary, b.date, b.author, b.image]);
}

function deleteBlogPost(id) {
  if (!isAdminLoggedIn()) return { success: false, message: "Unauthorized" };
  return deleteRowById(SHEETS.BLOGS, id);
}

function getRules() {
  var sheet = getSheet(SHEETS.RULES);
  if (!sheet) return { success: true, football: [], volleyball: [] };
  var data = sheet.getDataRange().getValues();
  var fb = [], vb = [];
  if (data.length > 1) { try { fb = JSON.parse(data[1][0]); } catch(e) {} }
  if (data.length > 2) { try { vb = JSON.parse(data[2][0]); } catch(e) {} }
  return { success: true, football: fb, volleyball: vb };
}

function saveRules(fb, vb) {
  if (!isAdminLoggedIn()) return { success: false, message: "Unauthorized" };
  var sheet = getSheet(SHEETS.RULES);
  sheet.clear();
  sheet.appendRow(["Rules JSON Storage"]);
  sheet.appendRow([JSON.stringify(fb)]);
  sheet.appendRow([JSON.stringify(vb)]);
  return { success: true, message: "Saved" };
}

/* --- HELPERS --- */
function getSheet(name) {
  var ss;
  if (SPREADSHEET_ID) ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  else ss = SpreadsheetApp.getActiveSpreadsheet();
  
  if (!ss) throw new Error("Spreadsheet not found");

  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    // Initialize headers
    if(name === SHEETS.ADMINS) sheet.appendRow(["ID", "Name", "Email", "Password", "MustChange", "CreatedAt"]);
    if(name === SHEETS.TEAMS) sheet.appendRow(["ID", "Name", "TournID", "Logo", "Sport", "CatID", "CatName"]);
    if(name === SHEETS.PLAYERS) sheet.appendRow(["ID", "Name", "Father", "Jersey", "TeamID", "TeamName", "TournID", "Sport", "CatID", "CatName", "Photo", "Admin", "Date"]);
    // NEW MATCHES HEADER (18 cols)
    if(name === SHEETS.MATCHES) sheet.appendRow(["matchId", "tournamentId", "tournamentName", "sport", "categoryId", "categoryName", "teamAId", "teamAName", "teamBId", "teamBName", "matchDate", "matchTime", "venue", "teamAScore", "teamBScore", "matchStatus", "createdBy", "createdAt"]);
    if(name === SHEETS.STANDINGS) sheet.appendRow(["TeamID", "Played", "Won", "Drawn", "Lost", "Points", "Category"]);
    if(name === SHEETS.BLOGS) sheet.appendRow(["ID", "Title", "Summary", "Date", "Author", "Image"]);
    if(name === SHEETS.TOURNAMENTS) sheet.appendRow(["ID", "Name", "Sport", "CatID", "CatName"]);
  }
  return sheet;
}

function upsertRow(sheet, id, rowData) {
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == id) {
      sheet.getRange(i + 1, 1, 1, rowData.length).setValues([rowData]);
      return { success: true, message: "Updated" };
    }
  }
  sheet.appendRow(rowData);
  return { success: true, message: "Created" };
}

function deleteRowById(sheetName, id) {
  var sheet = getSheet(sheetName);
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == id) {
      sheet.deleteRow(i + 1);
      return { success: true, message: "Deleted" };
    }
  }
  return { success: false, message: "Not found" };
}

function deleteRowByColumn(sheetName, colIndex, value) {
    var sheet = getSheet(sheetName);
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
        if (data[i][colIndex] == value) {
            sheet.deleteRow(i + 1);
            return { success: true, message: "Deleted" };
        }
    }
    return { success: false, message: "Not found" };
}