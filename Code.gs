var SPREADSHEET_ID = "1RDnDJ5tMaxpcHdIYTlJOs7AbkZEmUlAGYEXeoxvu5dI";
// This ID is a fallback. The script will try to use a folder named "Motbung_Player_Images" first.
var PLAYER_IMAGE_FOLDER_ID = "19twoj_GJL13WFiqX6A_SpS7joDno5p1t"; 

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

/**
 * !!! IMPORTANT !!!
 * RUN THIS FUNCTION ONCE MANUALLY IN THE EDITOR TO AUTHORIZE DRIVE ACCESS.
 * 1. Select 'authorizeScript' from the function dropdown at the top.
 * 2. Click 'Run'.
 * 3. Accept the permissions.
 */
function authorizeScript() {
  DriveApp.getRootFolder();
  console.log("Script is authorized to access Drive.");
}

/* --- CORS SUPPORT --- */
function doOptions(e) {
  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.TEXT)
    .append(""); 
}

/* --- PUBLIC GET (Health Check) --- */
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({ 
    status: "online", 
    message: "Motbung Veng API is running." 
  })).setMimeType(ContentService.MimeType.JSON);
}

/* --- MAIN POST HANDLER --- */
function doPost(e) {
  var lock = LockService.getScriptLock();
  var hasLock = lock.tryLock(30000); // Increased wait time to 30s for uploads

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
      case "login":
        result = adminLogin(data.email, data.password);
        break;
      case "logout":
        result = adminLogout();
        break;
      case "createAdmin":
        result = createAdmin(data.name, data.email, data.password);
        break;
      case "getAdmins":
        result = getAdmins();
        break;
      case "changePassword":
        result = changePassword(data.email, data.oldPassword, data.newPassword);
        break;
      case "deleteAdmin":
        result = deleteAdmin(data.email);
        break;

      // TOURNAMENTS
      case "getTournaments":
        result = getTournaments();
        break;
      case "createTournament":
        result = createTournament(data);
        break;
      case "deleteTournament":
        result = deleteTournament(data.tournamentId);
        break;

      // TEAMS
      case "getTeams":
        result = getTeams(data);
        break;
      case "createTeam":
        result = createTeam(data);
        break;
      case "deleteTeam":
        result = deleteTeam(data.teamId);
        break;

      // MATCHES
      case "getMatches":
        result = getMatches();
        break;
      case "upsertMatch":
        result = upsertMatch(data.data);
        break;
      case "deleteMatch":
        result = deleteMatch(data.id);
        break;

      // PLAYERS
      case "getPlayers":
        result = getPlayers(data);
        break;
      case "createPlayer":
        result = createPlayer(data);
        break;
      case "updatePlayer":
        result = updatePlayer(data);
        break;
      case "deletePlayer":
        result = deletePlayer(data.playerId);
        break;

      // STANDINGS
      case "getStandings":
        result = getStandings();
        break;
      case "upsertStanding":
        result = upsertStanding(data.data);
        break;
      case "deleteStanding":
        result = deleteStanding(data.teamId, data.category);
        break;

      // BLOGS
      case "getBlogPosts":
        result = getBlogPosts();
        break;
      case "upsertBlogPost":
        result = upsertBlogPost(data.data);
        break;
      case "deleteBlogPost":
        result = deleteBlogPost(data.id);
        break;

      // RULES
      case "getRules":
        result = getRules();
        break;
      case "saveRules":
        result = saveRules(data.football, data.volleyball);
        break;
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

/* --- AUTH IMPLEMENTATION --- */
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
    var dbEmail = String(data[i][2]).trim();
    var dbPass = String(data[i][3]).trim();
    
    if (dbEmail == String(email).trim() && dbPass == String(password).trim()) {
      PropertiesService.getUserProperties().setProperty("loggedInAdmin", email);
      return {
        success: true,
        email: email,
        name: data[i][1],
        mustChangePassword: data[i][4] === true || String(data[i][4]) === "true"
      };
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
    admins.push({
      adminId: data[i][0],
      name: data[i][1],
      email: data[i][2],
      mustChangePassword: data[i][4],
      createdAt: data[i][5]
    });
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
  var sheet = getSheet(SHEETS.ADMINS);
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][2] == email) {
      sheet.deleteRow(i + 1);
      return { success: true, message: "Admin deleted" };
    }
  }
  return { success: false, message: "Not found" };
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
    list.push({
      tournamentId: data[i][0],
      tournamentName: data[i][1],
      sport: data[i][2],
      categoryId: data[i][3],
      categoryName: data[i][4]
    });
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
    list.push({
      teamId: data[i][0],
      teamName: data[i][1],
      tournamentId: data[i][2],
      sport: data[i][4],
      categoryId: data[i][5],
      categoryName: data[i][6]
    });
  }
  return { success: true, teams: list };
}

function deleteTeam(id) {
  if (!isAdminLoggedIn()) return { success: false, message: "Unauthorized" };
  return deleteRowById(SHEETS.TEAMS, id);
}

/* --- MATCHES --- */
function getMatches() {
  var sheet = getSheet(SHEETS.MATCHES);
  if (!sheet) return { success: true, matches: [] };
  var data = sheet.getDataRange().getValues();
  var list = [];
  for (var i = 1; i < data.length; i++) {
    list.push({
      id: data[i][0],
      homeTeamId: data[i][1],
      awayTeamId: data[i][2],
      date: data[i][3],
      scoreHome: data[i][4],
      scoreAway: data[i][5],
      status: data[i][6],
      sport: data[i][7],
      category: data[i][8],
      location: data[i][9]
    });
  }
  return { success: true, matches: list };
}

function upsertMatch(m) {
  if (!isAdminLoggedIn()) return { success: false, message: "Unauthorized" };
  var sheet = getSheet(SHEETS.MATCHES);
  return upsertRow(sheet, m.id, [m.id, m.homeTeamId, m.awayTeamId, m.date, m.scoreHome, m.scoreAway, m.status, m.sport, m.category, m.location]);
}

function deleteMatch(id) {
  if (!isAdminLoggedIn()) return { success: false, message: "Unauthorized" };
  return deleteRowById(SHEETS.MATCHES, id);
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
  } else {
    // If no base64, check if an existing URL was passed (rare for create, but good for safety)
    photoUrl = (data.photoUrl && data.photoUrl.startsWith("http")) ? data.photoUrl : "";
  }

  // Row Structure based on headers provided:
  // playerId (0), playerName (1), fatherName (2), jerseyNo (3), teamId (4), teamName (5), tournamentId (6), sport (7), categoryId (8), categoryName (9), photoUrl (10)
  sheet.appendRow([
    playerId,
    data.playerName,
    data.fatherName || "",
    data.jerseyNo || "",
    data.teamId,
    data.teamName || "",
    data.tournamentId || "",
    data.sport || "",
    data.categoryId || "",
    data.categoryName || "",
    photoUrl, 
    adminEmail, // Extra metadata
    new Date() // Extra metadata
  ]);

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
        // photoUrl is at index 10, so column 11
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
    if (folders.hasNext()) {
        return folders.next();
    } else {
        return DriveApp.createFolder(folderName);
    }
}

function savePlayerImage(base64Data, playerId) {
  try {
    // 1. Get Folder: Try hardcoded ID first, then fallback to finding/creating "Motbung_Player_Images"
    var folder;
    try {
        if (PLAYER_IMAGE_FOLDER_ID) {
            folder = DriveApp.getFolderById(PLAYER_IMAGE_FOLDER_ID);
        } else {
            throw new Error("No ID");
        }
    } catch(e) {
        folder = getOrCreateFolder();
    }

    // 2. Parse Base64
    var split = base64Data.split(',');
    if (split.length < 2) return "Error: Invalid Base64"; 

    var type = split[0].split(':')[1].split(';')[0];
    var bytes = Utilities.base64Decode(split[1]);
    
    var ext = "jpg";
    if (type.includes("png")) ext = "png";
    if (type.includes("jpeg")) ext = "jpg";

    // 3. Create File
    var blob = Utilities.newBlob(bytes, type, playerId + "." + ext);
    // Delete existing file if present to avoid duplicates
    var existing = folder.getFilesByName(playerId + "." + ext);
    while (existing.hasNext()) {
        existing.next().setTrashed(true);
    }
    
    var file = folder.createFile(blob);
    
    // 4. Permissions
    try {
      file.setSharing(DriveApp.Access.ANYONE, DriveApp.Permission.VIEW);
    } catch(e) {
      try {
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      } catch (e2) {}
    }
    
    // 5. Return URL
    // Use the download/view URL format that works best for <img> tags
    return "https://drive.google.com/uc?export=view&id=" + file.getId();

  } catch(e) {
    var msg = e.toString();
    if (msg.includes("permission")) {
        return "Error: Script needs Authorization. Run authorizeScript() in editor.";
    }
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
    list.push({
      teamId: data[i][0],
      played: data[i][1],
      won: data[i][2],
      drawn: data[i][3],
      lost: data[i][4],
      points: data[i][5],
      category: data[i][6]
    });
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

/* --- BLOGS --- */
function getBlogPosts() {
  var sheet = getSheet(SHEETS.BLOGS);
  if (!sheet) return { success: true, blogs: [] };
  var data = sheet.getDataRange().getValues();
  var list = [];
  for (var i = 1; i < data.length; i++) {
    list.push({
      id: data[i][0],
      title: data[i][1],
      summary: data[i][2],
      date: data[i][3],
      author: data[i][4],
      image: data[i][5]
    });
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

/* --- RULES --- */
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
    if(name === SHEETS.ADMINS) sheet.appendRow(["ID", "Name", "Email", "Password", "MustChange", "CreatedAt"]);
    if(name === SHEETS.TEAMS) sheet.appendRow(["ID", "Name", "TournID", "Logo", "Sport", "CatID", "CatName"]);
    if(name === SHEETS.PLAYERS) sheet.appendRow(["ID", "Name", "Father", "Jersey", "TeamID", "TeamName", "TournID", "Sport", "CatID", "CatName", "Photo", "Admin", "Date"]);
    if(name === SHEETS.MATCHES) sheet.appendRow(["ID", "Home", "Away", "Date", "ScoreH", "ScoreA", "Status", "Sport", "Category", "Location"]);
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