aws.js
const { S3Client } = require("@aws-sdk/client-s3");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY,
        secretAccessKey: process.env.AWS_SECRET_KEY
    }
});

const docClient = DynamoDBDocumentClient.from(client);

const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY,
        secretAccessKey: process.env.AWS_SECRET_KEY
    }
});

module.exports = { docClient, s3 };
ticketModel.js
const { docClient } = require("../config/aws");
const {
    PutCommand,
    ScanCommand,
    GetCommand,
    UpdateCommand,
    DeleteCommand
} = require("@aws-sdk/lib-dynamodb");

const TABLE = "EventTickets";

exports.create = (data) => {
    return docClient.send(new PutCommand({
        TableName: TABLE,
        Item: data
    }));
};

exports.getAll = async() => {
    const res = await docClient.send(new ScanCommand({ TableName: TABLE }));
    return res.Items || [];
};

exports.getById = async(id) => {
    const res = await docClient.send(new GetCommand({
        TableName: TABLE,
        Key: { ticketId: id }
    }));
    return res.Item;
};

exports.update = (id, data) => {
    return docClient.send(new UpdateCommand({
        TableName: TABLE,
        Key: { ticketId: id },
        UpdateExpression: `
      set eventName=:e, price=:p, owner=:o,
      quantity=:q, category=:c, eventDate=:d
    `,
        ExpressionAttributeValues: {
            ":e": data.eventName,
            ":p": Number(data.price),
            ":o": data.owner,
            ":q": Number(data.quantity),
            ":c": data.category,
            ":d": data.eventDate
        }
    }));
};

exports.remove = (id) => {
    return docClient.send(new DeleteCommand({
        TableName: TABLE,
        Key: { ticketId: id }
    }));
};
app.js
require("dotenv").config();
const express = require("express");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");

const { s3 } = require("./config/aws");
const { PutObjectCommand } = require("@aws-sdk/client-s3");

const ticketModel = require("./models/ticketModel");

const app = express();
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

const upload = multer({ storage: multer.memoryStorage() });

function validate(data) {
    if (data.price <= 0) return "Giá phải > 0";
    if (data.quantity <= 0) return "Số lượng phải > 0";

    if (new Date(data.eventDate) < new Date()) {
        return "Ngày không hợp lệ";
    }

    const valid = ["Standard", "VIP", "VVIP"];
    if (!valid.includes(data.category)) {
        return "Category sai";
    }

    return null;
}

async function uploadToS3(file) {
    const key = Date.now() + "-" + file.originalname;

    await s3.send(new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype
    }));

    return `https://${process.env.S3_BUCKET}.s3.amazonaws.com/${key}`;
}

// HOME + SEARCH
app.get("/", async(req, res) => {
    let tickets = await ticketModel.getAll();
    const keyword = req.query.keyword || "";

    if (keyword) {
        tickets = tickets.filter(t =>
            t.eventName.toLowerCase().includes(keyword.toLowerCase()) ||
            t.owner.toLowerCase().includes(keyword.toLowerCase())
        );
    }

    res.render("index", { tickets });
});

// ADD
app.get("/add", (req, res) => res.render("add"));

app.post("/add", upload.single("image"), async(req, res) => {
    const error = validate(req.body);
    if (error) return res.send(error);

    const imageUrl = await uploadToS3(req.file);

    const data = {
        ticketId: uuidv4(),
        ...req.body,
        price: Number(req.body.price),
        quantity: Number(req.body.quantity),
        imageUrl,
        createdAt: new Date().toISOString()
    };

    await ticketModel.create(data);
    res.redirect("/");
});

// DETAIL
app.get("/detail/:id", async(req, res) => {
    const ticket = await ticketModel.getById(req.params.id);
    res.render("detail", { ticket });
});

// EDIT
app.get("/edit/:id", async(req, res) => {
    const ticket = await ticketModel.getById(req.params.id);
    res.render("edit", { ticket });
});

app.post("/edit/:id", async(req, res) => {
    await ticketModel.update(req.params.id, req.body);
    res.redirect("/");
});

// DELETE
app.get("/delete/:id", async(req, res) => {
    await ticketModel.remove(req.params.id);
    res.redirect("/");
});

app.listen(3000, () => console.log("Server chạy http://localhost:3000"));
index.ejs
<h1>Event Tickets</h1>

<form>
    <input name="keyword" placeholder="Search..." />
    <button>Tìm</button>
</form>

<a href="/add">Thêm</a>

<div class="card-container">
    <% tickets.forEach(t => { %>
        <div class="card">
            <img src="<%= t.imageUrl %>" />
            <h3>
                <%= t.eventName %>
            </h3>
            <p>
                <%= t.owner %>
            </p>
            <p>
                <%= t.price %>
            </p>

            <a href="/detail/<%= t.ticketId %>">Chi tiết</a>
            <a href="/edit/<%= t.ticketId %>">Sửa</a>
            <a href="/delete/<%= t.ticketId %>">Xóa</a>
        </div>
        <% }) %>
</div>
add.ejs
<h1>Thêm vé</h1>

<form method="POST" enctype="multipart/form-data">
    <input name="eventName" placeholder="Event name" required />
    <input name="owner" placeholder="Owner" required />
    <input name="price" placeholder="price" type="number" />
    <input name="quantity" placeholder="quantity" type="number" />
    <input name="eventDate" type="date" />

    <select name="category">
    <option>Standard</option>
    <option>VIP</option>
    <option>VVIP</option>
  </select>

    <input type="file" name="image" />
    <button>Save</button>
</form>
detail.ejs
<h1>Chi tiết vé</h1>

<img src="<%= ticket.imageUrl %>" width="300" />

<p>Tên:
    <%= ticket.eventName %>
</p>
<p>Owner:
    <%= ticket.owner %>
</p>
<p>Price:
    <%= ticket.price %>
</p>
<p>Category:
    <%= ticket.category %>
</p>
<p>Date:
    <%= ticket.eventDate %>
</p>

<a href="/">Back</a>
edit.ejs 
<h1>Sửa vé</h1>

<form method="POST">
    <input name="eventName" value="<%= ticket.eventName %>" />
    <input name="owner" value="<%= ticket.owner %>" />
    <input name="price" value="<%= ticket.price %>" />
    <input name="quantity" value="<%= ticket.quantity %>" />
    <input name="eventDate" value="<%= ticket.eventDate %>" />

    <select name="category">
    <option <%= ticket.category==='Standard'?'selected':'' %>>Standard</option>
    <option <%= ticket.category==='VIP'?'selected':'' %>>VIP</option>
    <option <%= ticket.category==='VVIP'?'selected':'' %>>VVIP</option>
  </select>

    <button>Update</button>
</form>
style.css
body {
    font-family: Arial;
}

.card-container {
    display: flex;
    gap: 20px;
    flex-wrap: wrap;
}

.card {
    width: 220px;
    border: 1px solid #ccc;
    padding: 10px;
}

.card img {
    width: 100%;
    height: 140px;
    object-fit: cover;
}
