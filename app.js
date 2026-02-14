const express = require('express')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const path = require('path')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

const app = express()
app.use(express.json())
const dbPath = path.join(__dirname, 'twitterClone.db')
let db = null

const initializeDBAndServer = async (req, res) => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log(`server running at http://localhost:3000/`)
    })
  } catch (err) {
    console.log(`DB Error: ${err.message}`)
    process.exit(1)
  }
}
initializeDBAndServer()

// server side testing 
app.get("/", (req, res)=>{
  res.send("hiii")
})

// authUser

const authUser = (req, res, next)=>{
  const authHeader = req.headers["authorization"]
  let jwtToken ;
  if(authHeader !== undefined){
    jwtToken = authHeader.split(" ")[1]
  }
  if(jwtToken === undefined){
    res.status(401)
    res.send("Invalid JWT Token")
  }else{
    jwt.verify(jwtToken, "secretKey", (err, payload)=>{
      if(err){
        res.status(401)
        res.send("Invalid JWT Token")
      }
      else{
        req.username = payload.username
        next()
      }
    })
  }
}

// api 1 register

app.post('/register/', async (req, res) => {
  const {username, password, name, gender} = req.body
  const hashPassword = await bcrypt.hash(password, 10)
  const selectUserQuery = `
        SELECT * FROM user WHERE username = "${username}";
    `
  const dbUser = await db.get(selectUserQuery)
  if (dbUser !== undefined) {
    res.status(400)
    res.send('User already exists')
  } else {
    if (password.length < 6) {
      res.status(400)
      res.send('Password is too short')
    } else {
      const addUserQuery = `
        INSERT INTO user(username, password, name, gender)
        VALUES("${username}", "${hashPassword}", "${name}", "${gender}")
      `
      await db.run(addUserQuery)
      res.status(200)
      res.send('User created successfully')
    }
  }
})

// api 2 login

app.post('/login/', async (req, res) => {
  const {username, password} = req.body
  const selectUserQuery = `
    SELECT * FROM user WHERE username = "${username}" ;
  `
  const dbUser = await db.get(selectUserQuery)
  if (dbUser === undefined) {
    res.status(400)
    res.send('Invalid user')
  } else {
    const comparePassword = await bcrypt.compare(password, dbUser.password)
    if (comparePassword === false) {
      res.status(400)
      res.send('Invalid password')
    } else {
      const payload = {username: username}
      const jwtToken = jwt.sign(payload, 'secretKey')
      res.send({jwtToken: jwtToken})
    }
  }
})

