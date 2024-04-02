import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3000;

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "<yourDatabase>",
  password: "<yourPassword>",
  port: 5432,
});
db.connect();

//Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

//Default user shown (Jack)
let currentUserId = 1;

//Contains users
var users = [];
async function getUsers(){
  var result = await db.query("SELECT id, user_name name, color FROM users");
  users = result.rows;
}
getUsers();


//Checks visited countries table and returns list of all country codes.
async function checkVisisted(user) {
  const result = await db.query("SELECT country_code FROM visited_countries WHERE user_id = $1", [user]);
  let countries = [];
  result.rows.forEach((country) => {
    countries.push(country.country_code);
  });
  return countries;
}

//Renders webpage for user from visited countries table
app.get("/", async (req, res) => {
  const countries = await checkVisisted(currentUserId);
  res.render("index.ejs", {
    countries: countries,
    total: countries.length,
    users: users,
    color: users[currentUserId - 1].color,
  });
});

//Add button
app.post("/add", async (req, res) => {
  const input = req.body["country"];

  //Get country code of inputted country name
  try {
    const result = await db.query(
      "SELECT country_code FROM countries WHERE LOWER(country_name) LIKE '%' || $1 || '%';",
      [input.toLowerCase()]
    );

    const data = result.rows[0];
    const countryCode = data.country_code;
    //Insert country code to visited countries table
    try {
      await db.query(
        "INSERT INTO visited_countries (user_id, country_code) VALUES ($1, $2)",
        [currentUserId, countryCode]
      );
      res.redirect("/");
    } catch (err) {
      console.log(err);
    }
  } catch (err) {
    console.log(err);
  }
});


//Pick another user 
app.post("/user", async (req, res) => {
  if (req.body.user){
    currentUserId = req.body.user;
    res.redirect("/");
  }
  else if (req.body.add){
    res.render("new.ejs");
  }
  else{
    console.log("something went wrong!")
  }
});

//Add new line in users table, redirect to get, change currentuserID
app.post("/new", async (req, res) => {
  try {await db.query(
    "INSERT INTO users (user_name, color) VALUES ($1, $2)",
    [req.body.name, req.body.color]
    );
    currentUserId = users.length;
    getUsers();
    res.redirect("/");
  }
  catch (err) {
    console.log(err);
  }

});


app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
