const express = require("express")
const app = express()
const port = process.env.PORT || 3000
require("dotenv").config()
const cors = require('cors')
// connect db
const mongoose = require("mongoose")
mongoose.connect(process.env.mongodb_uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})

// image Model
const imageScema = mongoose.Schema(
  {
    base64: String,
    type: String,
  },
  { timestamps: true }
)
const Image = mongoose.model("Image", imageScema)

app.use(cors())
app.use(express.json())
app.use(
  express.urlencoded({
    extended: true,
    limit: "10mb",
  })
)

app.get("/image/:id", async (req, res) => {
  if (req.params.id) {
    const find = await Image.findById(req.params.id).exec()
    if (find) {
      const img = Buffer.from(find.base64, "base64")
      res.writeHead(200, {
        "Content-Type": find.type,
        "Content-Length": img.length,
      })
      return res.end(img)
    }
    return res.status(404).send({
      message: "Not found image!",
    })
  }
})

app.post("/upload", async (req, res) => {
  if (req.body.base64) {
    // check max image
    const count = await Image.find().countDocuments().exec()
    const deleteMax = process.env.max_image / 2
    let c = 0
    if (count >= process.env.max_image) {
      const getForRemove = await Image.find().sort({ createdAt: -1 }).exec()
      for (let elem of getForRemove) {
        console.log(elem._id)
        await Image.findByIdAndDelete(elem._id).exec()
        c++
        if (c >= deleteMax) {
          console.log("break")
          break
        }
      }
    }
    const type = req.body.base64.match(/[^:]\w+\/[\w-+\d.]+(?=;|,)/)[0]
    const image = new Image({ base64: req.body.base64.split(",")[1], type })
    const save = await image.save()
    const fullUrl = req.protocol + "://" + req.get("host") + "/image"
    return res.json({ success: true, url: fullUrl + "/" + save._id })
  }
  return res.json({ success: false })
})

app.listen(port, () => {
  console.log(`Uploader api listening at http://localhost:${port}`)
})
