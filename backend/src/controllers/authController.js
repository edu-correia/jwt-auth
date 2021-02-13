require('dotenv').config();
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require('../models/user');

const router = express.Router();

function generateToken(id){
    const token = jwt.sign({id}, process.env.SECRET, {
        expiresIn: 86400
    });

    return token;
}

router.post('/register', async (req, res) => {
    const {email} = req.body;

    try {
        if(await User.findOne({email})){
            return res.status(400).send({error: "User already exists"});
        }

        const user = await User.create(req.body);

        user.password = undefined;

        const token = generateToken(user.id);
        
        return res.send({user, token});
    } catch (error) {
        return res.status(400).send({error: "Registration failed"});
    }
});

router.post('/authenticate', async (req, res) => {
    const {email, password} = req.body;

    const user = await User.findOne({email}).select('+password');

    if(!user)
        return res.status(400).send({error: 'User not found'});

    if(!await bcrypt.compare(password, user.password))
        return res.status(400).send({error: 'Invalid password'});

    user.password = undefined;

    const token = generateToken(user.id);

    res.send({user, token});
})

module.exports = app => app.use("/auth", router);