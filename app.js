const express = require("express");


const app = express();
app.use(express.json());



const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const cors = require("cors");

app.use(cors());

const path = require("path");
const { serialize } = require("v8");
const dbPath = path.join(__dirname, "courier_tracking.db");

let db = null;
const port = process.env.PORT || 4000;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
      app.listen(port, async () => {console.log("server is running on port 4000")});
  } catch (e) {
    console.log(e.message);
  }
};

initializeDBAndServer();

app.post("/users/", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const hashedPassword = await bcrypt.hash(request.body.password, 10);
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    const createUserQuery = `
      INSERT INTO 
        user (username, name, password, gender, location) 
      VALUES 
        (
          '${username}', 
          '${name}',
          '${hashedPassword}', 
          '${gender}',
          '${location}'
        )`;
    const dbResponse = await db.run(createUserQuery);
    const newUserId = dbResponse.lastID;
    response.send(`Created new user with ${newUserId}`);
  } else {
    response.status = 400;
    response.send("User already exists");
  }
});

//Login API

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `
        SELECT * FROM users WHERE username = '${username}';
    `;
  const dbUser = await db.get(selectUserQuery);

  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(
      password,
      dbUser.password_hash
    );
    if (isPasswordMatched) {
      const payload = { username: username };
      const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

const authenticateToken = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  }
};

app.post("/addPackage", async (request, response) => {
  const date = format(new Date(), "MM/dd/yyyy");
  const {
    courierId,
    courierName,
    fromAddress,
    toAddress,
    isDelivered = "false",
  } = request.body;

  const updateCourierQuery = `
    INSERT INTO couriers 
    VALUES
    (
        ${courierId},
        '${courierName}',
        '${fromAddress}',
       '${toAddress}',
        CURRENT_TIMESTAMP,
        '${isDelivered}'
    );
  `;
  const createCourier = await db.run(updateCourierQuery);
  console.log(createCourier);
  response.send("Courier Successfully Added");
});

app.post("/updatePackage", async (request, response) => {
    const { trackingId, status, location, courierId } = request.body;

    const updateCourierQuery = `
    INSERT INTO tracking_history 
    VALUES
    (
        ${trackingId},
        '${status}',
        '${location}',
         CURRENT_TIMESTAMP,
        '${courierId}'
    );
  `;
    const createCourier = await db.run(updateCourierQuery);
    console.log(createCourier);
    response.send("history Successfully Added");
});

app.get("/get", async (request, response) => {
  const query = `
   SELECT 
        *
    FROM 
       users;
   `;
  const obj = await db.all(query);
  response.send(obj);
});

