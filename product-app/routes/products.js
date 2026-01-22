const express = require("express");
const router = express.Router();
const { v4: uuidv4 } = require("uuid");

const dynamoDB = require("../aws/dynamodb");
const s3 = require("../aws/s3");
const upload = require("../middlewares/upload");

const {
    ScanCommand,
    PutCommand,
    GetCommand,
    UpdateCommand,
    DeleteCommand
} = require("@aws-sdk/lib-dynamodb");

const { PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");

const TABLE = "Products";
const BUCKET = process.env.S3_BUCKET_NAME;

// READ
router.get("/", async(req, res) => {
    const data = await dynamoDB.send(
        new ScanCommand({ TableName: TABLE })
    );
    res.render("products", { products: data.Items || [] });
});

// ADD FORM
router.get("/add", (req, res) => {
    res.render("add");
});

// CREATE
router.post("/add", upload.single("image"), async(req, res) => {
    const id = uuidv4();
    const { name, price, quantity } = req.body;

    let imageUrl = "";

    if (req.file) {
        const key = `products/${id}.jpg`;

        await s3.send(
            new PutObjectCommand({
                Bucket: BUCKET,
                Key: key,
                Body: req.file.buffer,
                ContentType: req.file.mimetype
            })
        );

        imageUrl = `https://${BUCKET}.s3.amazonaws.com/${key}`;
    }

    await dynamoDB.send(
        new PutCommand({
            TableName: TABLE,
            Item: {
                id,
                name,
                price: Number(price),
                quantity: Number(quantity),
                url_image: imageUrl
            }
        })
    );

    res.redirect("/");
});

// EDIT FORM
router.get("/edit/:id", async(req, res) => {
    const data = await dynamoDB.send(
        new GetCommand({
            TableName: TABLE,
            Key: { id: req.params.id }
        })
    );

    res.render("edit", { product: data.Item });
});

// UPDATE
router.post("/edit/:id", upload.single("image"), async(req, res) => {
    const { name, price, quantity } = req.body;

    await dynamoDB.send(
        new UpdateCommand({
            TableName: TABLE,
            Key: { id: req.params.id },
            UpdateExpression: "set #n=:n, price=:p, quantity=:q",
            ExpressionAttributeNames: { "#n": "name" },
            ExpressionAttributeValues: {
                ":n": name,
                ":p": Number(price),
                ":q": Number(quantity)
            }
        })
    );

    res.redirect("/");
});

// DELETE
router.get("/delete/:id", async(req, res) => {
    await dynamoDB.send(
        new DeleteCommand({
            TableName: TABLE,
            Key: { id: req.params.id }
        })
    );

    res.redirect("/");
});

module.exports = router;