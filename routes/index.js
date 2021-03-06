require('../models/Registration')
require('../models/feedback')
require('../models/comment');

const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const md5 = require('md5');
const { body, validationResult } = require('express-validator');
const { unlink } = require('fs-extra');
const Image = require('../models/Image');

const router = express.Router();
const credentials = mongoose.model('credentials');
const feedback = mongoose.model('feedback');
const Comment = mongoose.model('Comment');

const auth=require('http-auth');
const basic = auth.basic({
  file: path.join(__dirname, '../users.htpasswd'),
});


router.get('/', (req,res)=>{
  res.redirect('/login');
});

router.get('/login', (req,res)=>{
  if(req.session.loggedIn){
    res.redirect('/products');
  }else{
    res.render('login', {title:"Login"});
  }
  
});

router.post('/login',
  [
    body('email')
        .isEmail()
        .withMessage('Please enter a name'),
    body('password')
        .isLength({ min: 8 })
        .withMessage('Please enter an email'),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (errors.isEmpty()) {
      credentials.findOne(req.body, function(err, isMatch) {
        if(isMatch==null) {
          console.log('Wrong login: ');
          console.log(req.body);
          res.render('login', {
            title: 'login-error',
            error: 'Wrong email or password',
            data: req.body,
          });
        } else {
          req.session.loggedIn=true;
          req.session.name=isMatch.name;
          req.session.email=isMatch.email;
          console.log("user: "+req.session.name);
          res.redirect('/products');
        }
      })
    } else {
        res.render('login', {
        title: 'login-error',
        errors: errors.array(),
        data: req.body,
      });
    }
  }
);

router.get('/register', (req, res) => {
    res.render('register', { title: 'registration' });
});

router.post('/register', 
[
  body('email')
    .isEmail()
    .withMessage('missing valid email'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('missing a valid password (min 8 characters)'),
  body('name')
    .isLength({ min: 1})
    .withMessage('missing name'),
  body('age')
    .isLength({ min: 1 })
    .withMessage('missing age'),
  body('address')
    .isLength({ min: 1 })
    .withMessage('missing address'),
  body('city')
    .isLength({ min: 1 })
    .withMessage('missing city')
],
(req, res) =>{
  const errors = validationResult(req);
    if(errors.isEmpty()){
      var registration=new credentials(req.body);
      registration.save()
        .then(()=>{
          console.log('Registered successfully!');
          res.redirect('/products');
        })
        .catch(()=>{
          console.log('Registration failed - database error');
          res.redirect('/registration');
        });
    }else{
      res.render('register', {title:'Register-error', errors:errors.array(), data: req.body});
    }
  }
);

router.get('/products', async (req,res) => {
  if(req.session.loggedIn){
    const images = await Image.find();
    console.log("Welcome, "+req.session.name);
    res.render('index.ejs', { images, name:req.session.name });
  }else{
    res.redirect('/login');
  }
    
});

router.post('/upload', async (req, res) => {
  const image = new Image();
  image.title = req.body.title;
  image.price = req.body.price;
  image.description = req.body.description;
  image.category = req.body.category;
  image.filename = req.file.filename;
  image.path = '/img/uploads/' + req.file.filename;
  image.originalname = req.file.originalname;
  image.mimetype = req.file.mimetype;
  image.size = req.file.size;

  await image.save();

  res.redirect('/products');
});

router.get('/upload', (req, res) => {
  if(req.session.loggedIn){
    res.render('upload.ejs', {name:req.session.name});
  }else{
    res.redirect('/login');
  }    
});

router.get('/image/:id', async (req, res) => {
  if(req.session.loggedIn){
    const { id } = req.params;
    const image = await Image.findById(id);
    console.log(image);
    res.render('profile.ejs', { image, name:req.session.name , email:req.session.email},);
  }else{
    res.redirect('/login');
  }    
});

router.get('/image/:id/delete', async (req, res) => {
  const { id } = req.params;
  const image = await Image.findByIdAndDelete(id);
  await unlink(path.resolve('./public/' + image.path));
  res.redirect('/products');
});

router.post('/image/:id/feedback', async (req,res) => {
  const imgID = req.body.imageID;
  if (imgID) {
    const newComment = new Comment(req.body);
    newComment.gravatar = md5(newComment.email);
    newComment.image_id = imgID;
    await newComment.save();
    res.redirect('/products');
  }
});

router.get('/image/:id/feedback', async (req, res) => {
  if(req.session.loggedIn){
    const { id } = req.params;
    const image = await Image.findById(id);
    const comments = await Comment.find({image_id: id});
    res.render('reviews.ejs', { image, comments, name:req.session.name });
  }else{
    res.redirect('login');
  }
});

router.get('/logout', (req,res)=>{
  if(req.session.loggedIn){
    console.log("Session destroyed: "+req.session.username);
    req.session.destroy();
    res.redirect('/login');
  }else{
    res.redirect('/login');
  }
})

module.exports=router;