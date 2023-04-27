require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
var bodyParser = require('body-parser');
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Basic Configuration
const port = process.env.PORT || 3000;
app.use(cors());
app.use('/public', express.static(`${process.cwd()}/public`));
app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

let mongoose = require('mongoose');
mongoose.connect(process.env['MONGO_URI'], { useNewUrlParser: true, useUnifiedTopology: true });

// Users Schema
let userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true
  }
});

let User = mongoose.model('User', userSchema);

//Exercises Schema

let ExerciseSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  description: String,
  duration: Number,
  date: Date,
});

let Exercise = mongoose.model('Exercise', ExerciseSchema);

//post USERS
app.post('/api/users/', async (req, res) => {
  let username = req.body.username;
  console.log('username: ', username);

  User.findOne({ username: username }).then(function(data) {
    //User.collection.insertOne({ username: username });
    if (data) {
      console.log("data finded: ", data);
      res.json(data);
    } else {
      console.log("data not finded: ", data);
      User.collection.insertOne({ username: username }, function(error, response) {
        if (error) {
          console.log('Error occurred while inserting');
          // return 
        } else {
          console.log('inserted record', response);
          User.findOne({ username: username }).then(function(data) {
            res.json(data);
          });
          // return 
        }
      });
    }
  });

});

//get all users
app.get('/api/users/', async (req, res) => {
  User.find().then(function(data) {
    res.json(data);
  });
});

//post questions
app.post('/api/users/:_id/exercises', async (req, res) => {
  console.log('req body: ', req.body);

  // find user in DB with async method
  try {
    const data = await User.findById(req.params._id);
    if (!data) {
      console.log("User not found!");
      res.send("User not found!");
    } else {
      console.log("data user:", data);

      const exerciseObj = new Exercise({
        "userId": data._id,
        "username": data.username,
        "description": req.body.description,
        "duration": req.body.duration,
        "date": req.body.date ? new Date(req.body.date) : new Date()
      });

      /** 
      {
        username: "fcc_test",
        description: "test",
        duration: 60,
        date: "Mon Jan 01 1990",
        _id: "5fb5853f734231456ccb3b05"
      }
      
      */

      console.log("Exercise to save RAW: ", exerciseObj);
      
      //insert data into Exercises DB
      const exerciseSave = await exerciseObj.save();
      res.json({
        "username": data.username,
        "description": exerciseSave.description,
        "duration": exerciseSave.duration,
        "date": new Date(exerciseSave.date).toDateString(),
        "_id": data._id
      });
    }
  } catch (e) {
    console.log("Error found!");
    res.send("Error saving exercise!");
  }

});

app.get("/api/users/:_id/logs", async (req, res) => {
  console.log('req.query: ', req.query);
  console.log('req.params: ', req.params);

  // find user in DB with async method
  try {
    const data = await User.findById(req.params._id);
    if (!data) {
      console.log("User not found!");
      return;
    } else {
      console.log("data user:", data);

      //user founded, lets query

      let filter = {
        userId: req.params._id
      }

      const { from, to, limit } = req.query;

      //handle dates
      let dateObj = {};
      if(from){
        dateObj["$gte"] = new Date(from);
      }

      if(to){
        dateObj["$lte"] = new Date(to);
      }

      if( from || to ){
        filter.date = dateObj;
      }

      /** 
       
       username: "fcc_test",
       count: 1,
       _id: "5fb5853f734231456ccb3b05",
         log: [{
         description: "test",
         duration: 60,
         date: "Mon Jan 01 1990",
       }]
      
      */

      let userLog = {
        username: '',
        count: 0,
        _id: '',
        log: []
      };

      Exercise.find(filter).limit(+limit ?? 500).then(function(dataExercises) {
        console.log("dataExercises: ", dataExercises);
        userLog.username = dataExercises[0]._doc.username;
        userLog.count = dataExercises.length;
        userLog._id = dataExercises[0].userId;
        dataExercises.forEach(function(currentValue) {
          userLog.log.push({
            description: currentValue.description,
            duration: currentValue.duration,
            date: currentValue.date.toDateString()
          });
        });

        res.json(userLog);

      });
    }
  } catch (e) {
    console.log("Error found log!");
    res.json({
      'Error': 'Error found log!'
    });
  }

});

//load some assets
app.use("/public", express.static(__dirname + "/public"));

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
