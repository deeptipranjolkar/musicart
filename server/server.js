const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
// const ejs = require('ejs');
dotenv.config()

const app = express();
app.use(bodyParser.urlencoded({ extended:true}));
app.use(express.json());
app.use(express.static('./public'));
// app.set('view engine','ejs')
app.use(cors())

app.get('/',(req,res)=>{
    res.json({
        status: "sucess",
        message : "all good"
    })
})

const verifyAuthentication = (req, res, next) => {
    try {
      const user = jwt.verify(
        req.headers.authorization,
        process.env.JWT_SECRET_KEY
      )
      req.user = user
      next()
    } catch (error) {
      res.json({
        status: "ERROR",
        message: "Authentication failed. Please log in to continue.",
      })
    }
  }

const descriptionArray = [
  `It's lightest Wireless Noise-cancelling headband ever thats suitable for everyone.`,
  `Up to 50-hour battery life with quick charging (3 min charge for up to 1 hour of playback).`,
  `Multi-Point Connection helps to pair with two Bluetooth devices at the same time.`,
  `Take noise cancelling to the next level with Integrated Processor V1,so you can fully immerse yourself in the music.`,
  `Super comfortable and lightweight design ( 192 Grams ).`,
  `High sound quality and well-balanced sound tuning.`,
]




//schema for users
const User = mongoose.model("User",{
    firstName: String,
    lastName: String,
    email: String,
    mobile: Number,
    password: String,

})

//schema for products

const Product = mongoose.model("Product",{
    name: String,
  title: String,
  tagline: String,
  price: Number,
  type: String,
  company: String,
  color: String,
  description: Array,
  rating: Number,
  ratingCount: Number,
  isFeatured: Boolean,
  isAvailable: Boolean,
  images: Array,

})

//schema for cartItems
const UserCartItem = mongoose.model("UserCartItem", {
    userId: String,
    cartItems: Array,
  })

app.get("/api/products",async (req,res)=>{
    const {
        isAvailable,
    rating,
    company,
    color,
    type,
    price,
    title,
    search,
    sortBy,
    }=  req.query
     
    const displayConditions ={
        isAvailable,
        rating :{$gt : rating},
        price :{$gt: price.trimEnd,$lt:price.max}
    }

    if(company) displayConditions["company"] = company
    if (type) displayConditions["type"] = type
    if (color) displayConditions["color"] = color
    if (title) displayConditions["title"] = { $regex: new RegExp(title, "i") }
    const collation = { locale: "en", strength: 2 }
    try {
      const products = await Product.find(displayConditions)
        .collation(collation)
        .sort(sortBy)
      const { name, price, color, type, title, images } = products
      const productsList = products.map((eachProduct) => ({
        id: eachProduct._id,
        name: eachProduct.name,
        price: eachProduct.price,
        color: eachProduct.color,
        type: eachProduct.type,
        title: eachProduct.title,
        featuredImage: eachProduct.images[0],
      }))
      res.send(productsList)
    } catch (error) {
      console.log("The error is:", error)
      res.send({ status: "FAIL", error })
    }
  })
  app.get("/api/product/:id", async (req, res) => {
    const { id } = req.params
    try {
      const productDetails = await Product.findOne({ _id: id })
      res.send(productDetails)
    } catch (error) {
      res.send({ status: "FAIL", message: error })
    }
  })

  app.get("/api/get-filter-options", async (req, res) => {
    try {
      const colors = await Product.collection.distinct("color")
      const types = await Product.collection.distinct("type")
      const companies = await Product.collection.distinct("company")
      const price = [
        "₹0 - ₹1,000",
        "₹1,000 - ₹5,000",
        "₹5,000 - ₹10,000",
        "₹10,000+",
      ]
      console.log({ types, companies, colors })
  
      res.send([
        {
          id: "type",
          displayText: "Category",
          items: types,
        },
        {
          id: "company",
          displayText: "Company",
          items: companies,
        },
        {
          id: "color",
          displayText: "Colour",
          items: colors,
        },
        {
          id: "price",
          displayText: "Price",
          items: price,
        },
      ])
      // res.send("Hello")
    } catch (error) {
      res.send({ status: "FAIL", error })
    }
  })


  app.get("/api/get-cart-items", verifyAuthentication, async (req, res) => {
    const { userId } = req.query
    console.log(req.query)
    try {
      const { cartItems } = await UserCartItem.findOne({ userId })
      console.log(cartItems)
      const query = { _id: { $in: cartItems } }
      const products = await Product.find(query)
      const productsList = products.map((eachProduct) => ({
        id: eachProduct._id,
        name: eachProduct.name,
        price: eachProduct.price,
        color: eachProduct.color,
        type: eachProduct.type,
        isAvailable: eachProduct.isAvailable,
        featuredImage: eachProduct.images[0],
        quantity: 1,
      }))
      console.log({ productsList })
      res.send(productsList)
    } catch (error) {
      res.send(error)
    }
  })
  app.get('/api/all-data', async (req, res) => {
    try {
    
      const allProducts = await Product.find();
  
      
      res.send(allProducts);
    } catch (error) {
     
      console.error(error);
      res.status(500).json({ status: 'FAIL', message: 'Internal server error' });
    }
  });


  app.post("/api/add-cart-items", async (req, res) => {
    try {
      const { userId, productId } = req.body
      const isUserExists = await UserCartItem.findOne({ userId: userId })
  
      if (isUserExists) {
        await UserCartItem.updateOne(
          { userId },
          { $push: { cartItems: productId } }
        )
      } else {
        console.log("The user does not exist")
        await UserCartItem.create({
          userId,
          cartItems: [productId],
        })
      }
  
      res.send({ message: "Product added successfully" })
    } catch (error) {
      console.error(error)
      res.send({ error: "Internal server error" })
    }
  })

//login
app.post('api/login',async(req,res)=>{
    console.log(req.body)
    try {
      const { emailOrMobile, password } = req.body
      // console.log(emailOrMobile)
      const existingUser = await User.findOne({
        $or: [{ email: emailOrMobile?.toLowerCase() }, { mobile: emailOrMobile }],
      })
      console.log(existingUser)
      if (existingUser) {
        const existingHashedPassword = existingUser.password
        const isPasswordMatch = await bcrypt.compare(
          password,
          existingHashedPassword
        )
        if (isPasswordMatch) {
          const jwtToken = jwt.sign(
            { existingUser },
            process.env.JWT_SECRET_KEY,
            {
              expiresIn: "15d",
            }
          )
          // res.header({ jwtToken })
          res.send({
            status: "SUCCESS",
            message: "Login Successful",
            data: { jwtToken, user: { id: existingUser._id } },
          })
        } else {
          throw "Incorrect password"
        }
        // console.log("The password match status is", isPasswordMatch)
      } else {
        console.log("Error thrown")
        throw "User not found"
      }
      console.log({ existingUser })
    } catch (error) {
      console.log({ error })
      res.status(400)
      res.send({
        status: "FAIL",
        message: error,
      })
    }

})


//signup 
app.post("/api/signup",async(req,res)=>{
    try{
        const {firstName, lastName,email,mobile,password} = req.body
        const doesEmailAlreadyExits = await User.findOne({
            email:email.tolowerCase(),
        })
        if(doesEmailAlreadyExits){
            throw "this email id already exists"
            return
        }
        const doesMobileAlredayExists = await User.findOne({mobile})
        if(doesMobileAlredayExists){
            throw "mobile already exists"
            return
        }
        const hashedPassword = await bcrypt.hash(password,10)
        console.log(hashedPassword)
        const newUser ={
            firstName,lastName,
            email : email.tolowerCase(),
            mobile,
            password:hashedPassword,
        }
        const newUserDetails = await User.create(newUser)
        console.log(newUserDetails)
        const jwToken = jwt.sign({newUser},process.env.JWT_SECRET_KEY,{expiresIn:2000})
        res.status(210)
        res.send({
            status:"success",
            message:"Account has been created successfully",
            data:{jwToken,user:{id:newUserDetails._id}},
        })
    }catch(error){
        console.log(error)
        res.status(400)
        res.send({
            status:'FAIL',
            message:error
        })
    }
})



app.listen(process.env.PORT,()=>{
    mongoose.connect(process.env.MONGODB_URL,{ useNewUrlParser: true, useUnifiedTopology: true }).then(()=>{
        console.log(`server running on http://localhost:${process.env.PORT}`)
    }).catch((error)=>console.log(error))
})