var address = '35.185.40.217';
var rootPwd = 'idontknow';
var user = 'testing';
var userPwd = '1234';
var db = 'labrador';

var root = 'root';
var instanceUrl = 'jdbc:mysql://' + address;
var dbUrl = instanceUrl + '/' + db;

// Create a new database within a Cloud SQL instance.
function createDatabase() {
    var conn = Jdbc.getConnection(instanceUrl, root, rootPwd);
    conn.createStatement().execute('CREATE DATABASE ' + db);
}

// Create a new user for your database with full privileges.
function createUser() {
    var conn = Jdbc.getConnection(dbUrl, root, rootPwd);

    var stmt = conn.prepareStatement('CREATE USER ? IDENTIFIED BY ?');
    stmt.setString(1, user);
    stmt.setString(2, userPwd);
    stmt.execute();

    conn.createStatement().execute('GRANT ALL ON `%`.* TO ' + user);
}

// Create a new table in the database.
function createTable() {
    var conn = Jdbc.getConnection(dbUrl, user, userPwd);
    conn.createStatement().execute('CREATE TABLE entries '
        + '(guestName VARCHAR(255), content VARCHAR(255), '
        + 'entryID INT NOT NULL AUTO_INCREMENT, PRIMARY KEY(entryID));');
}

// Write one row of data to a table.
function writeOneRecord() {
    var conn = Jdbc.getConnection(dbUrl, user, userPwd);

    var stmt = conn.prepareStatement('INSERT INTO entries '
        + '(guestName, content) values (?, ?)');
    stmt.setString(1, 'First Guest');
    stmt.setString(2, 'Hello, world');
    stmt.execute();
}

// Write 500 rows of data to a table in a single batch.
function writeManyRecords() {
    var conn = Jdbc.getConnection(dbUrl, user, userPwd);
    conn.setAutoCommit(false);

    var start = new Date();
    var stmt = conn.prepareStatement('INSERT INTO entries '
        + '(guestName, content) values (?, ?)');
    for (var i = 0; i < 500; i++) {
        stmt.setString(1, 'Name ' + i);
        stmt.setString(2, 'Hello, world ' + i);
        stmt.addBatch();
    }

    var batch = stmt.executeBatch();
    conn.commit();
    conn.close();

    var end = new Date();
    Logger.log('Time elapsed: %sms for %s rows.', end - start, batch.length);
}

// Read up to 1000 rows of data from the table and log them.
function readFromTable(maxRows) {
    var conn = Jdbc.getConnection(dbUrl, user, userPwd);

    var start = new Date();
    var stmt = conn.createStatement();
    stmt.setMaxRows(maxRows);
    var results = stmt.executeQuery('SELECT * FROM products');
    var numCols = results.getMetaData().getColumnCount();

    while (results.next()) {
        var rowString = '';
        for (var col = 0; col < numCols; col++) {
            rowString += results.getString(col + 1) + '\t';
        }
        Logger.log(rowString)
    }

    results.close();
    stmt.close();

    var end = new Date();
    Logger.log('Time elapsed: %sms', end - start);
}

// Execute raw sql query in the database and return result as JSON
function getProductsLike(keyword, limit) {
    var conn = Jdbc.getConnection(dbUrl, user, userPwd);

    var start = new Date();
    var stmt = conn.createStatement();
    stmt.setMaxRows(limit);
    // need to change preparedStatement
    var query = "SELECT * FROM products WHERE name LIKE '%" + keyword + "%' LIMIT " + limit;
    var results = stmt.executeQuery(query);
    var metaData = results.getMetaData();
    var numCols = metaData.getColumnCount();
    var colNames = [];
    var resultSet = [];

    // store column names
    for (var col = 0; col < numCols; col++) {
        var colName = metaData.getColumnName(col + 1);
        colNames.push(colName);
    }

    while (results.next()) {
        var rowObj = {};
        for (col = 0; col < numCols; col++) {
            rowObj[colNames[col]] = results.getString(col + 1);
        }
        resultSet.push(rowObj);
    }

    results.close();
    stmt.close();

    var end = new Date();
    Logger.log('Time elapsed: %sms', end - start);

    return resultSet;
}

/**
 * Main method is called when the script receives a GET request.
 * Receives the request, generates and returns the output.
 */
function doGet(request) {
    // Get request params.
    var keyword  = request.parameters.keyword;
    var callback  = request.parameters.callback;

    // Check database connection
//  var products = readFromTable(1000);

    // Connect to database instance
    var products = getProductsLike(keyword, 1);

    // Write and return the response.
    var response = JSON.stringify({ products: products });
    var output = ContentService.createTextOutput();
    if (callback == undefined) {
        // Serve as JSON
        output.setContent(response).setMimeType(ContentService.MimeType.JSON);
    } else {
        // Serve as JSONP
        output.setContent(callback + "(" + response + ")")
            .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return output;
}

/**
 * Test raw sql query
 */
function testSql() {
    runTest_({
        parameters : {
            keyword : "energ"
        }
    });
}