require("dotenv").config();
const mongoose = require("mongoose");

const configs = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
    useFindAndModify: false
};

mongoose.connect(process.env.MONGODB_URI, configs);
mongoose.Promise = global.Promise;

module.exports = mongoose;