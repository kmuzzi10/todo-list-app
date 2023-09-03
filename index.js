import express from "express";
import bodyParser from "body-parser";

const app = express();

app.set('view engine','ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));
const port =3000;

const item = [];

app.get("/",(req,res)=>{
    const date = new Date();

let currentDay= String(date.getDate()).padStart(2, '0');

let currentMonth = String(date.getMonth()+1).padStart(2,"0");

let currentYear = date.getFullYear();
let fullDate = `${currentDay}-${currentMonth}-${currentYear}`;


    res.render("index.ejs",{fullDate:fullDate})
});


app.post()









app.listen(port,()=>{
    console.log(`server started at port ${port}`)
})