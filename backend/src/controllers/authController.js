require('dotenv').config();
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const mailer = require('../utils/mailer');

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
});

router.post('/forgot_password', async (req, res) => {
    const {email} = req.body;

    try {
        const user = await User.findOne({email});

        if(!user)
            return res.status(400).send({error: 'User not found'});

        const token = crypto.randomBytes(20).toString('hex');

        const now = new Date();
        now.setHours(now.getHours() + 1);

        await User.findByIdAndUpdate(user.id, {
            '$set': {
                passwordResetToken: token,
                passwordResetExpires: now
            }
        })

        mailer.sendMail({
            to: email,
            from: 'eduardo.correia.ehsc@gmail.com',
            template: 'auth/forgot_password',
            context: {token}
        },(err) => {
            if(err) {
                return res.status(400).send({error: "Cannot send forgot password email"});
            }

            return res.send();
        })
    } catch (error) {
        return res.status(400).send({error: "Erro on Forgot_Password, try again"})
    }
});

router.post('/reset_password', async (req, res) => {
    const {email, token, password} = req.body;

    try {
        const user = await User.findOne({email}).select('+passwordResetToken passwordResetExpires');

        if(!user)
            return res.status(400).send({error: 'User not found'});

        if(token !== user.passwordResetToken)
            return res.status(400).send({error: 'Invalid token'});

        const now = new Date();

        if(now > user.passwordResetExpires)
            return res.status(400).send({error: 'Token expired'});

        user.password = password;

        await user.save();

        res.send();
    } catch (error) {
        res.status(400).send({error: "Cannot reset password, try again"})
    }
})

module.exports = app => app.use("/auth", router);