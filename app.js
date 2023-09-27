import 'dotenv/config';
import express from "express";
import bodyParser from "body-parser";
import mongoose, { mongo } from "mongoose";
import _ from "lodash";
import session from 'express-session';
import passport from 'passport';
import passportLocalMongoose from "passport-local-mongoose";
import findOrCreate from "mongoose-findorcreate";
import Google from "passport-google-oauth20";
const GoogleStrategy = Google.Strategy;

//import section ends


const app = express();


//express setup
app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false

}));

app.use(passport.initialize());
app.use(passport.session());


//mongo db
mongoose.connect(process.env.CONNECTION);
// mongoose.connect("mongodb://127.0.0.1:27017/todolistDB");
// mongoose.set("useCreateIndex",true) 

//item
const itemsSchema = mongoose.Schema({
  name: String
});
const Item = mongoose.model("item", itemsSchema);
//list
const listSchema = mongoose.Schema({
  name: String,
  items: [itemsSchema],
})

const List = mongoose.model("List", listSchema);

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  email: String,
  googleId: String,
  items: [itemsSchema],
  lists: [listSchema]

});
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = mongoose.model("user", userSchema);

passport.use(User.createStrategy());

//serialize and deserialize
passport.serializeUser((user, done) => {
  done(null, user.id);
});


passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id).exec(); // Execute the query and await the result
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});


//google strategy authentication 
passport.use(new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/google/list",
  userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
},
  function (accessToken, refreshToken, profile, cb) {
    console.log(profile)
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

const item1 = {
  name: "welcome to todo list"
}
const item2 = {
  name: "hit the + button to add todos"
}
const item3 = {
  name: "hit checkbox to delete items"
}
const defaultItem = [item1, item2, item3]





app.get("/", (req, res) => {
  res.render("signin", { alertMessage: "Wrong details! Please try again.", user: "" });
});
app.get("/auth/google", passport.authenticate('google', { scope: ["profile"] })

);

app.get("/auth/google/list",
  passport.authenticate('google', { failureRedirect: '/signin' }),
  function (req, res) {
    // Successful authentication, redirect home.
    res.redirect("/list");
  });

app.get("/signup", (req, res) => {
  res.render("signup.ejs")
});

app.get("/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      console.log(err)
    } else {
      res.redirect("/")
    }
  });

})


app.get("/list", async function (req, res) {

  if (req.isAuthenticated()) {
    try {
      const foundUser = await User.findById(req.user._id).exec();
      if (foundUser) {
        const items = foundUser.items; // Get the items of the authenticated user
        if (items.length === 0) {
          foundUser.items = [
            { name: "welcome to todo list" },
            { name: "hit the + button to add todos" },
            { name: "hit checkbox to delete items" }
          ];
          await foundUser.save();
          res.redirect("/list")
        } else {
          res.render("list", { listTitle: "Today", newListItems: items });
        }
      }
    } catch (err) {
      console.log(err)
    }
  } else {
    res.redirect("/");
  }
});



app.get("/list/:customListName", async (req, res) => {
  if (req.isAuthenticated()) {
    const customListName = _.capitalize(req.params.customListName);
    const ab = req.params.customListName;

    try {
      // Find the authenticated user
      const foundUser = await User.findById(req.user._id).exec();

      if (!foundUser) {
        res.redirect("/");
        return;
      }

      // Check if the user has a list with the specified name
      const foundList = foundUser.lists.find(list => list.name === customListName);

      if (ab == "about") {
        res.render("about.ejs");
      } else if (!foundList) {
        // Create a new list for the user
        const newList = {
          name: customListName,
          items: defaultItem
        };
        foundUser.lists.push(newList);
        await foundUser.save();
        res.redirect("/list/" + customListName);
      } else {
        // Show the existing list for the user
        res.render("list", { listTitle: foundList.name, newListItems: foundList.items });
      }
    } catch (err) {
      console.error(err);
    }
  } else {
    res.redirect("/");
  }
});


app.post("/list", async function (req, res) {
  if (req.isAuthenticated()) {
    const itemName = req.body.newItem;
    const listName = req.body.list;

    try {
      // Find the authenticated user
      const foundUser = await User.findById(req.user._id).exec();

      if (!foundUser) {
        res.redirect("/");
        return;
      }

      // Create a new item
      const item = new Item({
        name: itemName
      });

      if (listName === "Today") {
        // Add the item to the user's items
        foundUser.items.push(item);
        await foundUser.save();
        res.redirect("/list");
      } else {
        // Check if the user has a list with the specified name
        const foundList = foundUser.lists.find(list => list.name === listName);

        if (foundList) {
          // Add the item to the specific list
          foundList.items.push(item);
          await foundUser.save();
          res.redirect("/list/" + listName);
        } else {
          console.log("List doesn't exist");
          // Handle the case where the list doesn't exist
        }
      }
    } catch (err) {
      console.error(err);
      // Handle the error appropriately
    }
  } else {
    res.redirect("/");
  }
});





app.post("/delete", async (req, res) => {
  if (req.isAuthenticated()) {
    const checkBoxId = req.body.checkbox;
    const listName = req.body.listName;

    try {
      const foundUser = await User.findById(req.user._id).exec();

      if (foundUser) {
        if (listName === "Today") {
          // Delete the item from the user's items
          foundUser.items.pull(checkBoxId); // Remove the item by _id
          await foundUser.save();
          res.redirect("/list");
        } else {
          // Find the user's list by name
          const foundList = foundUser.lists.find(list => list.name === listName);

          if (foundList) {
            // Delete the item from the specific list
            foundList.items.pull(checkBoxId); // Remove the item by _id
            await foundUser.save(); // Save the changes
            res.redirect("/list/" + listName);
          } else {
            console.log("List doesn't exist");
            // Handle the case where the list doesn't exist
          }
        }
      }
    } catch (err) {
      console.error(err);
      // Handle the error appropriately
    }
  } else {
    res.redirect("/");
  }
});




app.post("/signup", (req, res) => {
  User.register(new User({ username: req.body.username, email: req.body.email }), req.body.password, (err, user) => {
    if (err) {
      console.log(err);
      res.redirect("/signup");
    } else {
      passport.authenticate("local")(req, res, () => {
        res.redirect("/list");
      });
    }
  });
});

app.post("/signin", (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) {
      // Handle error
      return next(err);
    }
    if (!user) {
      // Credentials are incorrect, send an alert message and render the signin page
      return res.render("signin", { user: null, alertMessage: "Wrong details! Please try again." });
    }


    // Credentials are correct, log in the user
    req.login(user, (err) => {
      if (err) {
        // Handle error
        return next(err);
      }
      // Redirect to the list page upon successful login
      return res.redirect("/list");
    });
  })(req, res, next);
});





//port section start






let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000
}

app.listen(port, function () {
  console.log("Server started on port 3000");
});
