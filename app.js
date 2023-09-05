import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import _ from "lodash";

//mongo db
mongoose.connect("mongodb+srv://your uri @cluster0.2npnjpc.mongodb.net/todolistDB");
const itemsSchema = mongoose.Schema({
  name: String
})
const Item = mongoose.model("item", itemsSchema)

const app = express();


//express
app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

//mongodb
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

const listSchema = mongoose.Schema({
  name: String,
  items: [itemsSchema]
})

const List = mongoose.model("List", listSchema)





app.get("/list", async function (req, res) {
  //mongo
  const items = await Item.find({}).exec();

  if (items.length === 0) {
    Item.insertMany(defaultItem);
    res.redirect("/list")
  } else {
    res.render("list", { listTitle: "Today", newListItems: items });
  }
  


});

app.get("/list/:customListName", async (req, res) => {
  const customListName = _.capitalize(req.params.customListName);
  const ab = req.params.customListName;
  try {
    const foundList = await List.findOne({ name: customListName });

    if (ab == "about") {
      res.render("about.ejs")
    }
    if (!foundList) {
      //create new list
      const list = new List({
        name: customListName,
        items: defaultItem
      });
      list.save();
      res.redirect("/list/" + customListName)
    }
    else {
      //show existing list
      res.render("list", { listTitle: foundList.name, newListItems: foundList.items })
    }
  } catch (err) {
    console.error(err);
  }


})







app.post("/list", async function (req, res) {

  const itemName = req.body.newItem;
  const listName = req.body.list;

  const item = new Item({
    name: itemName
  });
  if (listName === "Today") {
    item.save();
    res.redirect("/list")
  } else {
    try {
      const foundList = await List.findOne({ name: listName });
      if (foundList) {
        foundList.items.push(item);
        await foundList.save();
        res.redirect("/list/" + listName);
      } else {
        console.log("List doesn't exist");
        // Handle the case where the list doesn't exist
      }
    } catch (err) {
      console.error(err);
      // Handle the error appropriately
    }
  }



});





app.post("/delete", async (req, res) => {
  const checkBoxId = req.body.checkbox;
  const listName = req.body.listName;
  if (listName == "Today") {
    await Item.deleteOne({ _id: checkBoxId });
    res.redirect("/list")
  } else {
    try {
      const foundList = await List.findOne({ name: listName });
      if (foundList) {
        const updatedList = await List.findOneAndUpdate(
          { name: listName },
          { $pull: { items: { _id: checkBoxId } } }
        );
        if (updatedList) {
          res.redirect("/list/" + listName);
        } else {
          console.log("List not updated");
        }
      } else {
        console.log("List doesn't exist");
        // Handle the case where the list doesn't exist
      }
    } catch (err) {
      console.error(err);
      // Handle the error appropriately
    }
  }


})

//login schema
const signinSchema = mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  password: {
    type: String,
    require: true

  }
});
const collection = new mongoose.model("collection", signinSchema);



app.get("/", (req, res) => {
  res.render("signin")
});
app.get("/signup", (req, res) => {
  res.render("signup.ejs")
});


app.post("/signup", async (req, res) => {
  const data = {
    name: req.body.name,
    password: req.body.pass
  };
  await collection.insertMany([data]);
  res.redirect("/")
})
app.post("/signin", async (req, res) => {
  try {
    const check = await collection.findOne({ name: req.body.name });
    if (check.password === req.body.pass) {
      res.redirect("/list");
    } else {
      res.send("please try agin wrong password");
    }
  } catch {
    res.send("wrong details")
  }

})






























//port start

let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000
}

app.listen(port, function () {
  console.log("Server started on port 3000");
});
