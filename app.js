import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";


//mongo db
mongoose.connect("mongodb://127.0.0.1:27017/todolistDB");
const itemsSchema = mongoose.Schema({
  name:String
})
const Item = mongoose.model("item",itemsSchema)

const app = express();


//express
app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
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
  const defaultItem = [item1,item2,item3]
  


app.get("/", async function(req, res) {

  const date = new Date();

  let currentDay = String(date.getDate()).padStart(2, '0');

  let currentMonth = String(date.getMonth() + 1).padStart(2, "0");

  let currentYear = date.getFullYear();
  let day = `${currentDay}-${currentMonth}-${currentYear}`;
  

//mongo
  const items =await Item.find({}).exec();

  if(items.length === 0){
    Item.insertMany(defaultItem);
    res.redirect("/")
  }else{
    res.render("list", {listTitle: day, newListItems: items});
  }


});

app.post("/", function(req, res){

  const itemName = req.body.newItem;
  
  const item = new Item({
    name:itemName
  });

  item.save();
  res.redirect("/")


//   if (req.body.list === "Work") {
//     workItems.push(item);
//     res.redirect("/work");
//   } else {
//     items.push(item);
//     res.redirect("/");
//   }
});

app.get("/work", function(req,res){
  res.render("list", {listTitle: "Work List", newListItems: workItems});
});

app.get("/about", function(req, res){
  res.render("about");
});

app.listen(3000, function() {
  console.log("Server started on port 3000");
});
