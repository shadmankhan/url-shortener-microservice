require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
const bodyParser = require("body-parser");
const dns = require("dns");
const mongoose = require("mongoose");
const shortId = require("shortid");
const URLSchema = require("./models/url.model");

const uri = process.env.DB_URI;
mongoose.connect(uri, {
  useNewUrlParser: true,
  useCreateIndex: true,
  useUnifiedTopology: true,
});

const connection = mongoose.connection;
connection.once("open", () => {
  console.log("MongoDB database connection established successfully!");
});

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));
app.use("/public", express.static(`${process.cwd()}/public`));

app.get("/", function (req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});

// Your first API endpoint
app.get("/api/hello", function (req, res) {
  res.json({ greeting: "hello API" });
});

app.post("/api/shorturl/new", (req, res) => {
  const { url } = req.body;
  const urlCode = shortId.generate();
  const noHTTPSUrl = url.replace(/^https?:\/\//, "");

  dns.lookup(noHTTPSUrl, async (err) => {
    if (err) {
      return res.json({
        error: "invalid URL",
      });
    } else {
      try {
        let findOne = await URLSchema.findOne({
          original_url: url,
        });

        if (findOne) {
          res.json({
            original_url: findOne.original_url,
            short_url: findOne.short_url,
          });
        } else {
          // if its not exist yet then create new one and response with the result
          findOne = new URLSchema({
            original_url: url,
            short_url: urlCode,
          });
          await findOne.save();
          res.json({
            original_url: findOne.original_url,
            short_url: findOne.short_url,
          });
        }
      } catch (e) {
        console.error(err);
        res.status(500).json("Server erorr...");
      }
    }
  });
});

app.get("/api/shorturl/:short_url?", async function (req, res) {
  try {
    const urlParams = await URLSchema.findOne({
      short_url: req.params.short_url,
    });
    if (urlParams) {
      return res.redirect(urlParams.original_url);
    } else {
      return res.status(404).json("No URL found");
    }
  } catch (err) {
    console.log(err);
    res.status(500).json("Server error");
  }
});
app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});
