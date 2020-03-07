const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const {check, validationResult} = require('express-validator');
const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/origami', {
    useNewUrlParser: true
});

var reSlugChar=/^[a-z]{1,}$/;
const fileUpload=require('express-fileupload');
const session=require('express-session');
const Allpages = mongoose.model('Allpages',{
    pagetitle: String,
    slug: String,
    message:String,
    image:String
} );

const Admin=mongoose.model('Admin',{
    username:String,
    password:String
});

const Header=mongoose.model('Header',{
    type:String,
    pagetitle:String,
    logo:String
});

var myApp = express();

myApp.use(bodyParser.urlencoded({ extended:false}));
myApp.use(session({
    secret:"randomsecret",
    resave:false,
    saveUninitialized:true
}));
myApp.use(bodyParser.json())
myApp.use(fileUpload());
myApp.set('views', path.join(__dirname, 'views'));
myApp.use(express.static(__dirname+'/public'));
myApp.set('view engine', 'ejs');

//---------------- Routes ------------------

myApp.get('/',function(req, res){
    Allpages.findOne({slug:'home'}).exec(function(err,page){
        Allpages.find({}).exec(function(err,pages){
            Header.findOne({type:'header'}).exec(function(err,header){
                res.render('index',{header:header,pages:pages,page:page})
            });  
        });
    });
});

myApp.get('/contact',function(req, res){
    if(req.session.userLoggedIn)
    {    
        Header.findOne({type:'header'}).exec(function(err,header){
            res.render('addPage',{header:header})
        });
    }
    else
    {
        res.redirect('/login');
    }
});

myApp.post('/contact',[
    check('title', 'Please enter title').not().isEmpty(),
    check('slug', 'Please enter slug').not().isEmpty(),
    check('slug').custom((value, {req}) => {
        if(!(reSlugChar).test(value))
        {
            throw new Error('Slug should contain small alphabets only');
        }
        return true;
    }),
    check('message', 'Please enter message').not().isEmpty()
],function(req, res){
    const errors = validationResult(req);
    console.log(errors);
    if(!errors.isEmpty()){
        var errorsData = {
            errors: errors.array(),
        }
        Header.findOne({type:'header'}).exec(function(err,header){
            res.render('addPage',{header:header})
        });
    }
    else{
        var title = req.body.title;
        var slug=req.body.slug;
        var imageName=req.files.myimage.name; // image name is saved
        var image=req.files.myimage // save file in temp buffer
        var imgpath='public/contact_images/'+imageName;
        var message=req.body.message;
        image.mv(imgpath,function(err){
            console.log(err);
        });
        
        var myAllPages = new Allpages({
            pagetitle: title,
            slug: slug,
            message: message,
            image:imageName
        });
        myAllPages.save().then(()=>{
            console.log('New Page added successfully');
        });
        var pageData = {
            // name: name,
            // phone: phone,
            // qty: qty,
            // cost: cost,
            // message: message
        };
        res.redirect('/allpages');
    }
});

// ------------ New Routes ---------------------

myApp.get('/login',function(req, res){
    if(!(req.session.userLoggedIn))
    {
        Header.findOne({type:'header'}).exec(function(err,header){
            res.render('login',{header:header})
        });
    }
    else
    {
        res.redirect('/allpages');
    }
});

myApp.post('/login',function(req, res){
    var username=req.body.username;
    var password=req.body.password;
    Admin.findOne({username:username,password:password}).exec(function(err,admins){
        req.session.username=admins.username;
        req.session.userLoggedIn=true;
        res.redirect('/allpages');
    });
});

myApp.get('/logout',function(req, res){
    if(req.session.userLoggedIn)
    {
        req.session.destroy();   
        Header.findOne({type:'header'}).exec(function(err,header){
            res.render('logout',{header:header})
        }); 
    }
});

myApp.get('/allpages',function(req, res){
    if(req.session.userLoggedIn)
    {
        Allpages.find({}).exec(function(err,pages){
            Header.findOne({type:'header'}).exec(function(err,header){
                res.render('allpages',{header:header,pages:pages})
            });  
        });
    }
    else
    {
        res.redirect('/login');
    }
});

myApp.get('/edit/:id',function(req, res){
    if(req.session.userLoggedIn)
    {     
        var id=req.params.id;
        //res.send(localname);
        Allpages.findOne({_id:id}).exec(function(err,page){
            Header.findOne({type:'header'}).exec(function(err,header){
                res.render('edit',{header:header,page:page})
            });
        });
    }
    else
    {
        res.redirect('/login');
    }
});

myApp.post('/edit/:id',function(req, res){
    //fetch all data to updated
    var id=req.params.id;
    var pagetitle = req.body.title;
    var imageName=req.files.myimage.name; // image name is saved
    var image=req.files.myimage // save file in temp buffer
    var imgpath='public/contact_images/'+imageName;
   
    if(imageName==''||imageName==null)
    {
        imageName='default_img.jpg';
        imgpath='public/contact_images/default_img.jpg';
    }
    image.mv(imgpath,function(err){
        console.log(err);
    });
    var slug = req.body.slug;
    var message = req.body.message;
    //fetch the page with the id from URL from the database
    Allpages.findOne({_id:id}).exec(function(err,page){
        // edit the fetch object from the database
        page.pagetitle=pagetitle;
        page.slug=slug;
        page.message=message;
        page.image=imageName;
        page.save().then( ()=>{
            console.log('page updated');
        });
    });
    res.redirect('/allpages');
});

myApp.get('/editHeader/header',function(req, res){
    if(req.session.userLoggedIn)
    {    
        Header.findOne({type:'header'}).exec(function(err,header){
            res.render('editHeader',{header:header})
        });
    }
    else
    {
        res.redirect('/login');
    }
});

myApp.post('/editHeader',function(req, res){
    //fetch all data to updated
    var id=req.params.id;
    var pagetitle = req.body.name;
    var imageName=req.files.myimage.name; // image name is saved
    var image=req.files.myimage // save file in temp buffer
    var imgpath='public/contact_images/'+imageName;
    image.mv(imgpath,function(err){
        console.log(err);
    });
   
    //fetch the contac with the id from URL from the database
    Header.findOne({type:'header'}).exec(function(err,header){
        // edit the fetch object from the database
        header.type='header';
        header.pagetitle=pagetitle;
        header.logo=imageName;
        header.save().then( ()=>{
            console.log('Header updated');
        });
    });
    res.redirect('/allpages');
});

myApp.get('/delete/:id',function(req, res){
    var id=req.params.id;
    //res.send(localname);
    Allpages.findByIdAndDelete({_id:id}).exec(function(err,page){
        Header.findOne({type:'header'}).exec(function(err,header){
            res.render('delete',{header:header})
        });
    });
});

myApp.get('/single/:anyname',function(req, res){
    var localname=req.params.anyname;
    console.log(localname)
    if(localname=='Home')
    {
        res.redirect('/');
    }
    //res.send(localname);
    Allpages.find({}).exec(function(err,pages){
        Header.findOne({type:'header'}).exec(function(err,header){
            Allpages.findOne({pagetitle:localname}).exec(function(err,page){
            res.render('Singlepage',{header:header,pages:pages,page:page})
        })});  
    });
  
   // res.render('singlecontclsact');
});
//----------- Start the server -------------------

myApp.listen(8080);
console.log('Server started at 8080 for mywebsite...');