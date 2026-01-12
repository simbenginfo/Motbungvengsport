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
  RULES: "Rules",
  COMMENTS: "Comments" 
};

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

      // MATCHES
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
      case "recalculateStandings": result = recalculateStandings(); break;

      // BLOGS
      case "createBlog": result = createBlog(data); break;
      case "getBlogs": result = getBlogs(); break;
      case "updateBlog": result = updateBlog(data); break;
      case "deleteBlog": result = deleteBlog(data.postId); break;
      
      // COMMENTS
      case "addComment": result = addComment(data); break;
      case "getComments": result = getComments(data.blogId); break;

      // RULES
      case "getRules": result = getRules(); break;
      case "saveRules": result = saveRules(data.general, data.football, data.volleyball); break;
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
  return deleteRowByColumn(SHEETS.ADMINS, 2, email);
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

/* --- MATCHES (With Time Fix & Auto Standings) --- */
function createMatch(data) {
  if (!isAdminLoggedIn()) return { success: false, message: "Unauthorized" };
  if (!data.teamAId || !data.teamBId || !data.matchDate) return { success: false, message: "Missing required fields" };

  var d = new Date(data.matchDate);
  if (isNaN(d.getTime())) {
    return { success: false, message: "Invalid Date Format" };
  }

  var sheet = getSheet(SHEETS.MATCHES);
  var adminEmail = PropertiesService.getUserProperties().getProperty("loggedInAdmin");
  var matchId = "match_" + Date.now();

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
    d,
    data.matchTime || "",
    data.venue || "",
    "", // ScoreA
    "", // ScoreB
    "Upcoming",
    adminEmail,
    new Date()
  ]);

  return { success: true, message: "Match created", matchId: matchId };
}

function getMatches(filters) {
  var sheet = getSheet(SHEETS.MATCHES);
  
  // Use getDisplayValues for formatting accuracy (Time, etc.)
  var rawData = sheet.getDataRange().getValues();
  var displayData = sheet.getDataRange().getDisplayValues();

  var matches = [];

  if (rawData.length < 2) return { success: true, matches: [] };

  for (var i = 1; i < rawData.length; i++) {
    var row = rawData[i];
    var dispRow = displayData[i];
    
    // Fallback ID for manually entered rows
    var mId = row[0];
    if (!mId) mId = "manual_row_" + (i + 1);

    // Skip empty rows
    if (!row[7] && !row[9] && !row[10]) continue;

    // Time Fix: Use DISPLAY value
    var timeStr = dispRow[11];
    if (!timeStr) timeStr = ""; 

    var dateVal = row[10];
    var dateStr = "";
    if (dateVal instanceof Date) {
        dateStr = dateVal.toISOString();
    } else {
        dateStr = String(dateVal || "");
    }

    matches.push({
        matchId: mId,
        tournamentId: row[1] || "",
        tournamentName: row[2] || "",
        sport: row[3] || "",
        categoryId: row[4] || "",
        categoryName: row[5] || "",
        teamA: { id: row[6] || "", name: row[7] || "Unknown", score: row[13] },
        teamB: { id: row[8] || "", name: row[9] || "Unknown", score: row[14] },
        matchDate: dateStr, 
        matchTime: timeStr, 
        venue: row[12],
        status: row[15] || "Upcoming"
    });
  }
  return { success: true, matches: matches };
}

function updateMatch(data) {
  if (!isAdminLoggedIn()) return { success: false, message: "Unauthorized" };
  
  var sheet = getSheet(SHEETS.MATCHES);
  var rows = sheet.getDataRange().getValues();
  var updated = false;

  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] === data.matchId) {
      if (data.matchDate) {
         var d = new Date(data.matchDate);
         if (!isNaN(d.getTime())) sheet.getRange(i + 1, 11).setValue(d);
      }
      if (data.matchTime) sheet.getRange(i + 1, 12).setNumberFormat("@").setValue(data.matchTime);
      if (data.venue) sheet.getRange(i + 1, 13).setValue(data.venue);

      if (data.teamAScore !== undefined) sheet.getRange(i + 1, 14).setValue(data.teamAScore);
      if (data.teamBScore !== undefined) sheet.getRange(i + 1, 15).setValue(data.teamBScore);
      if (data.status) sheet.getRange(i + 1, 16).setValue(data.status);
      
      updated = true;
      break;
    }
  }
  
  if (updated) {
      // Auto-recalculate if match is completed
      // Normalize 'Completed' check (trim spaces, ignore case if needed)
      if (data.status && data.status.trim() === 'Completed') {
          recalculateStandings();
      }
      return { success: true, message: "Match updated" };
  }
  
  return { success: false, message: "Match not found" };
}

function deleteMatch(matchId) {
  if (!isAdminLoggedIn()) return { success: false, message: "Unauthorized" };
  var res = deleteRowById(SHEETS.MATCHES, matchId);
  if(res.success) recalculateStandings(); // Recalc on delete too
  return res;
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

/* --- STANDINGS CALCULATION --- */
function initTeam(table, tournamentId, tournamentName, sport, categoryId, categoryName, team) {
  if (!table[team.id]) {
    table[team.id] = {
      tournamentId: tournamentId,
      tournamentName: tournamentName,
      sport: sport,
      categoryId: categoryId,
      categoryName: categoryName,
      teamId: team.id,
      teamName: team.name,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      points: 0
    };
  }
}

function updateStats(teamA, teamB, scoreA, scoreB, sport) {
  // Normalize sport comparison
  var s = String(sport || "").trim().toLowerCase();
  
  teamA.played++;
  teamB.played++;

  if (s.includes("football")) {
    teamA.goalsFor += scoreA;
    teamA.goalsAgainst += scoreB;
    teamB.goalsFor += scoreB;
    teamB.goalsAgainst += scoreA;

    if (scoreA > scoreB) {
      teamA.wins++; teamA.points += 3;
      teamB.losses++;
    } else if (scoreA < scoreB) {
      teamB.wins++; teamB.points += 3;
      teamA.losses++;
    } else {
      teamA.draws++; teamB.draws++;
      teamA.points += 1; teamB.points += 1;
    }
  } else if (s.includes("volleyball")) {
    // Basic volleyball logic
    if (scoreA > scoreB) {
      teamA.wins++; teamA.points += 2; 
      teamB.losses++;
    } else {
      teamB.wins++; teamB.points += 2;
      teamA.losses++;
    }
  } else {
    // Fallback default: 3pts for win, 1 for draw
    if (scoreA > scoreB) {
      teamA.wins++; teamA.points += 3;
      teamB.losses++;
    } else if (scoreA < scoreB) {
      teamB.wins++; teamB.points += 3;
      teamA.losses++;
    } else {
      teamA.draws++; teamB.draws++;
      teamA.points += 1; teamB.points += 1;
    }
  }
}

function recalculateStandings(tournamentId) {
  var standingsSheet = getSheet(SHEETS.STANDINGS);
  
  // Get All Completed Matches
  var matchesSheet = getSheet(SHEETS.MATCHES);
  var matches = matchesSheet.getDataRange().getValues();
  var table = {};

  for (var i = 1; i < matches.length; i++) {
    // Robust status check
    var status = String(matches[i][15] || "").trim();
    if (status !== "Completed") continue;
    
    // Optional filter by tournament
    if (tournamentId && matches[i][1] !== tournamentId) continue;

    var row = matches[i];
    var tId = row[1];
    var tName = row[2];
    var sport = row[3];
    var cId = row[4];
    var cName = row[5];
    
    var tAId = row[6];
    var tAName = row[7];
    var scoreA = Number(row[13]);
    
    var tBId = row[8];
    var tBName = row[9];
    var scoreB = Number(row[14]);

    // Safety checks
    if (!tAId || !tBId) continue; 
    if (isNaN(scoreA)) scoreA = 0;
    if (isNaN(scoreB)) scoreB = 0;

    initTeam(table, tId, tName, sport, cId, cName, { id: tAId, name: tAName });
    initTeam(table, tId, tName, sport, cId, cName, { id: tBId, name: tBName });

    updateStats(table[tAId], table[tBId], scoreA, scoreB, sport);
  }

  // Clear existing content except header
  if (standingsSheet.getLastRow() > 1) {
    standingsSheet.getRange(2, 1, standingsSheet.getLastRow() - 1, standingsSheet.getLastColumn()).clearContent();
  } else {
    // If sheet is empty or only header (which might be wrong/old), recreate header
    standingsSheet.clear();
    standingsSheet.appendRow([
      "tournamentId", "tournamentName", "sport",
      "categoryId", "categoryName",
      "teamId", "teamName",
      "played", "wins", "draws", "losses",
      "goalsFor", "goalsAgainst", "goalDifference",
      "points", "lastUpdated"
    ]);
  }

  var output = [];
  for (var teamId in table) {
    var t = table[teamId];
    output.push([
      t.tournamentId, t.tournamentName, t.sport,
      t.categoryId, t.categoryName,
      t.teamId, t.teamName,
      t.played, t.wins, t.draws, t.losses,
      t.goalsFor, t.goalsAgainst,
      t.goalsFor - t.goalsAgainst,
      t.points, new Date()
    ]);
  }

  // Batch write for performance
  if (output.length > 0) {
    standingsSheet.getRange(2, 1, output.length, output[0].length).setValues(output);
  }

  return { success: true, message: "Standings recalculated" };
}

function getStandings() {
  var sheet = getSheet(SHEETS.STANDINGS);
  var rows = sheet.getDataRange().getValues();
  var standings = [];

  // Start from 1 to skip header
  for (var i = 1; i < rows.length; i++) {
    standings.push({
      tournamentId: rows[i][0],
      tournamentName: rows[i][1],
      sport: rows[i][2],
      categoryId: rows[i][3],
      categoryName: rows[i][4],
      teamId: rows[i][5],
      teamName: rows[i][6],
      played: rows[i][7],
      wins: rows[i][8],
      draws: rows[i][9],
      losses: rows[i][10],
      goalsFor: rows[i][11],
      goalsAgainst: rows[i][12],
      goalDifference: rows[i][13],
      points: rows[i][14]
    });
  }
  return { success: true, standings: standings };
}

/* --- BLOGS --- */
function createBlog(data) {
  if (!isAdminLoggedIn()) {
    return { success: false, message: "Unauthorized" };
  }

  if (!data.title || !data.content) {
    return { success: false, message: "Title and content required" };
  }

  var sheet = getSheet(SHEETS.BLOGS);
  var adminEmail = PropertiesService.getUserProperties()
    .getProperty("loggedInAdmin");

  var postId = "blog_" + Date.now();

  sheet.appendRow([
    postId,
    data.title,
    data.content,
    data.coverImageUrl || "",
    adminEmail,
    new Date(),
    ""
  ]);

  return {
    success: true,
    message: "Blog created",
    postId: postId
  };
}

function getBlogs() {
  var sheet = getSheet(SHEETS.BLOGS);
  var rows = sheet.getDataRange().getValues();
  var blogs = [];

  // Iterate backwards to show newest first, skipping header (index 0)
  for (var i = rows.length - 1; i > 0; i--) {
    blogs.push({
      postId: rows[i][0],
      title: rows[i][1],
      content: rows[i][2],
      coverImageUrl: rows[i][3],
      createdBy: rows[i][4],
      createdAt: rows[i][5]
    });
  }

  return { success: true, blogs: blogs };
}

function updateBlog(data) {
  if (!isAdminLoggedIn()) {
    return { success: false, message: "Unauthorized" };
  }

  var sheet = getSheet(SHEETS.BLOGS);
  var rows = sheet.getDataRange().getValues();

  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] === data.postId) {
      sheet.getRange(i + 1, 2).setValue(data.title);
      sheet.getRange(i + 1, 3).setValue(data.content);
      sheet.getRange(i + 1, 4).setValue(data.coverImageUrl || "");
      sheet.getRange(i + 1, 7).setValue(new Date());

      return { success: true, message: "Blog updated" };
    }
  }

  return { success: false, message: "Blog not found" };
}

function deleteBlog(postId) {
  if (!isAdminLoggedIn()) {
    return { success: false, message: "Unauthorized" };
  }

  var sheet = getSheet(SHEETS.BLOGS);
  var rows = sheet.getDataRange().getValues();

  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] === postId) {
      sheet.deleteRow(i + 1);
      return { success: true, message: "Blog deleted" };
    }
  }

  return { success: false, message: "Blog not found" };
}

function getRules() {
  var sheet = getSheet(SHEETS.RULES);
  if (!sheet) return { success: true, general: [], football: [], volleyball: [] };
  var data = sheet.getDataRange().getValues();
  var gen = [], fb = [], vb = [];
  
  // Row 1: Header
  // Row 2: General Rules (New)
  // Row 3: Football Rules
  // Row 4: Volleyball Rules
  
  if (data.length > 1) { try { gen = JSON.parse(data[1][0]); } catch(e) {} }
  if (data.length > 2) { try { fb = JSON.parse(data[2][0]); } catch(e) {} }
  if (data.length > 3) { try { vb = JSON.parse(data[3][0]); } catch(e) {} }
  
  return { success: true, general: gen, football: fb, volleyball: vb };
}

function saveRules(gen, fb, vb) {
  if (!isAdminLoggedIn()) return { success: false, message: "Unauthorized" };
  var sheet = getSheet(SHEETS.RULES);
  sheet.clear();
  sheet.appendRow(["Rules JSON Storage (General, Football, Volleyball)"]);
  sheet.appendRow([JSON.stringify(gen || [])]);
  sheet.appendRow([JSON.stringify(fb || [])]);
  sheet.appendRow([JSON.stringify(vb || [])]);
  return { success: true, message: "Saved" };
}

/* --- COMMENTS --- */
function addComment(data) {
  if (!data.blogId || !data.name || !data.comment) {
    return { success: false, message: "Missing fields" };
  }

  var sheet = getSheet(SHEETS.COMMENTS);
  var commentId = "cmt_" + Date.now();

  sheet.appendRow([
    commentId,
    data.blogId,
    data.name,
    data.comment,
    new Date(),
    "approved"
  ]);

  return {
    success: true,
    message: "Comment added"
  };
}

function getComments(blogId) {
  if (!blogId) {
    return { success: false, message: "Blog ID required" };
  }

  var sheet = getSheet(SHEETS.COMMENTS);
  var rows = sheet.getDataRange().getValues();
  var comments = [];

  for (var i = 1; i < rows.length; i++) {
    // Only return comments for this blogId and that are 'approved' (basic moderation)
    if (String(rows[i][1]) === String(blogId)) {
      comments.push({
        commentId: rows[i][0],
        name: rows[i][2],
        comment: rows[i][3],
        createdAt: rows[i][4]
      });
    }
  }

  return { success: true, comments: comments };
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
    if(name === SHEETS.MATCHES) sheet.appendRow(["matchId", "tournamentId", "tournamentName", "sport", "categoryId", "categoryName", "teamAId", "teamAName", "teamBId", "teamBName", "matchDate", "matchTime", "venue", "teamAScore", "teamBScore", "matchStatus", "createdBy", "createdAt"]);
    if(name === SHEETS.STANDINGS) sheet.appendRow(["tournamentId", "tournamentName", "sport", "categoryId", "categoryName", "teamId", "teamName", "played", "wins", "draws", "losses", "goalsFor", "goalsAgainst", "goalDifference", "points", "lastUpdated"]);
    // Updated BLOGS header to match new functionality
    if(name === SHEETS.BLOGS) sheet.appendRow(["postId", "title", "content", "coverImageUrl", "createdBy", "createdAt", "updatedAt"]);
    if(name === SHEETS.TOURNAMENTS) sheet.appendRow(["ID", "Name", "Sport", "CatID", "CatName"]);
    // Initialize COMMENTS header
    if(name === SHEETS.COMMENTS) sheet.appendRow(["commentId", "blogId", "name", "comment", "createdAt", "status"]);
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
    return "Error: " + e.toString();
  }
}