const functions = require("firebase-functions");
const cors = require("cors")({origin: true});
const express = require("express");
const admin = require("firebase-admin");
admin.initializeApp();

const app = express();


var validateFirebaseIdToken = async function (req, res, next) {
    if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
        console.error('No Auth Headers Found')
        res.status(401).json({"message": 'Unauthorized'});
        return;
    }
    let idToken;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        console.log('Found "Authorization" header');
        idToken = req.headers.authorization.split('Bearer ')[1];
        console.log("fire token : "+idToken);
    }

    try {
        const decodedIdToken = await admin.auth().verifyIdToken(idToken);
        console.log('ID Token correctly decoded', decodedIdToken);
        req.user = decodedIdToken;
        next();
        return;
    } catch (error) {
        console.error('Error while verifying Firebase ID token:', error);
        res.status(401).json({message:"Unauthorized"});
        return;
    }
}
app.use(validateFirebaseIdToken);

app.get("/api/articles", (req, res) => {
    var db = admin.firestore()
    db.collection(req.user.user_id).doc("articles").collection("articles").get()
        .then(doc => {
            console.log(doc)
           if(doc._size === 0) {
            console.log("Not exists");
            res.status(200).json({articles: []})
           } else {
               var articles = []
               doc.forEach(article => {
                    articles.push(article.data().date)
               });
               res.status(200).json(articles)
           }
        })
});
app.post("/api/articles", (req, res) => {
     var date = new Date(req.query.date)
     console.log(date)
     if(!date) {
        res.status(400).json({message: `Value '${req.query.date}' is not a valid date (format: 'yyyy-MM-dd')`})
        return;
     }
     if(date > new Date()) {
        res.status(400).json({message: "Date can't be future"});
        return;
     }
     if(date < Date.parse("1995-06-16")) {
        res.status(400).json({message: "Date have to be after or equal: 1995-06-16"});
        return;
     }
     console.log(req.query.date)
     var db = admin.firestore()
     db.collection(req.user.user_id).doc("articles").collection("articles").doc(req.query.date).set({"date": req.query.date})
             .then(doc => {
                 res.status(201).send();
             })
});

app.delete("/api/articles", (req, res) => {
    var db = admin.firestore();
    var date = new Date(req.query.date)
    if(!date) {
        res.status(400).json({message: `Value '${req.query.date}' is not a valid date (format: 'yyyy-MM-dd')`})
        return;
    }
    if(date > new Date()) {
        res.status(400).json({message: "Date can't be future"});
        return;
    }
    if(date < Date.parse("1995-06-16")) {
        res.status(400).json({message: "Date have to be after or equal: 1995-06-16"});
        return;
    }
    var date_string = req.query.date
    console.log(`${req.user.user_id}/articles/articles/${date_string}`)
    db.collection(req.user.user_id).doc("articles").collection("articles").doc(date_string).get()
        .then(doc => {
            if(!doc.exists) {
                res.status(404).json({"message": "Date not found"});
            } else {
                db.collection(req.user.user_id).doc("articles").collection("articles").doc(date_string).delete()
                    .then(params => {
                        console.log(params)
                        res.status(204).send();
                    })
            }
        })
})

exports.app = functions.https.onRequest(app)
