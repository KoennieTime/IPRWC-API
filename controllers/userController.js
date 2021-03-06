// Used libraries
const db = require('../db');
const _ = require('lodash');
const { v4:uuidv4 } = require('uuid');
const cartController = require("./cartController.js");
const mailSender = require('../controllers/mailController');
const bcrypt = require('bcrypt');
const { post } = require('../routes/userRoutes');

// Database table name
const TABLE = 'user';

hashPassword = async (password) => {
    return await new Promise((resolve, reject) => {
        bcrypt.hash(password, 7, function (err, hash) {
            if (err) reject(err)
            resolve(hash)
        });
    })
}

/**
 * Select all users
 * 
 * @param {req} req - necessary in order for result
 * @param {res} res - You always send a result back to the user
 * @param {next} next - Use in documentation, never used
 * 
 * @return {result} res - Always return an object with a message and status code
 */
exports.getAllUsers = (req, res, next) => {
    db.query('SELECT ${columns:name} FROM ${table:name}', {
        columns: ['user_id', 'voornaam', 'achternaam', 'email'],
        table: TABLE
    })
    .then(result => {
        res.status(200).json({
            result: result
        });
    })
    .catch(error => {
        res.status(404).json({
            error: error.message || error
        });
    });
};

exports.createUser = async (req, res, next) => {

    const { voornaam, achternaam, email, wachtwoord, straatnaam, huisnummer, plaatsnaam } = req.body;
    const user_id = uuidv4();
    const winkelwagenid = uuidv4();

    const password_hash = await hashPassword(wachtwoord);

    db.query('SELECT ${columns:name} FROM ${table:name} WHERE email = ${useremail}', {
        columns: ['user_id', 'email'],
        table: TABLE,
        useremail: email
    })
    .then(result => {
        // Email is already in use
        if(_.isEmpty(result)) {
            // No email found - is empty
            db.query('INSERT INTO ${table:name} (${columns:name}) VALUES (${cartid})', {
                table: 'cart',
                columns: ['cart_id'],
                cartid: winkelwagenid
            })
            
            db.query('INSERT INTO ${table:name} (${columns:name}) VALUES (${userid}, ${firstname}, ${lastname}, ${useremail}, ${userpassword}, ${streetname}, ${housenumber}, ${placename}, ${cartid})', {
                table: TABLE,
                columns: ['user_id', 'voornaam', 'achternaam', 'email', 'wachtwoord', 'straatnaam', 'huisnummer', 'plaatsnaam', 'cart_id'],
                userid: user_id,
                firstname: voornaam,
                lastname: achternaam,
                useremail: email,
                userpassword: password_hash,
                streetname: straatnaam,
                housenumber: huisnummer,
                placename: plaatsnaam,
                cartid: winkelwagenid
            })
            .then(result => {
                res.status(200).json({
                    'create': true,
                    result: result
                });
            })
            .catch(error => {
                res.status(404).json({
                    error: error.message || error
                });
            });
        } else {
            // email is found - denied action
            res.status(400).json({
                code: 400,
                error: "email is already in use"
            });
        }
    })
    .catch(error => {
        // Email have not been found
        const user_id = uuidv4();
        const winkelwagenid = uuidv4();

        db.query('INSERT INTO ${table:name} (${columns:name}) VALUES (${cartid})', {
            table: 'cart',
            columns: ['cart_id'],
            cartid: winkelwagenid
        })
        .then(result => {
            if(_.isEmpty(result)) {
                res.status(200).json({
                    'create': true,
                    result: result
                });
            }
        })
        .catch(error => {
            res.status(404).json({
                error: error.message || error
            });
        });

        db.query('INSERT INTO ${table:name} (${columns:name}) VALUES (${userid}, ${firstname}, ${lastname}, ${useremail}, ${userpassword}, ${streetname}, ${housenumber}, ${placename}, ${cartid})', {
            table: TABLE,
            columns: ['user_id', 'voornaam', 'achternaam', 'email', 'wachtwoord', 'straatnaam', 'huisnummer', 'plaatsnaam', 'cart_id'],
            userid: user_id,
            firstname: voornaam,
            lastname: achternaam,
            useremail: email,
            userpassword: password_hash,
            streetname: straatnaam,
            housenumber: huisnummer,
            placename: plaatsnaam,
            cartid: winkelwagenid
        })
        .then(result => {
            res.status(200).json({
                result: result
            });
        })
        .catch(error => {
            res.status(404).json({
                error: error.message || error
            });
        });
    });
};

/**
 * Check if the user login is correct
 * 
 * @param {req} req - necessary in order to select user by email, password
 * @param {res} res - You always send a result back to the user
 * @param {next} next - Use in documentation, never used
 * 
 * @return {result} res - Always return an object with a message and status code
 */
exports.checkUserLogin = (req, res, next) => {
    const {email, wachtwoord} = req.body;

    if (typeof email === 'undefined' || typeof wachtwoord === 'undefined') {
        return res.status(200).json({login: 'failed', error: true});
    }

    db.query("SELECT * FROM ${table:name} WHERE email=${useremail}", {
        table: TABLE,
        useremail: email
    })
    .then(async result => {
        const match = await bcrypt.compare(wachtwoord, result[0].wachtwoord);

        if(match) {
            res.status(200).json({
                login: true,
                result: result
            });
        } else {
            res.status(200).json({
                login: false,
                result: result
            });
        }
    })
    .catch(error => {
        res.status(404).json({
            error: error.message || error
        });
    });
};

/**
 * change password by selecting the user on email
 * 
 * @param {req} req - necessary in order to select user by ID
 * @param {res} res - You always send a result back to the user
 * @param {next} next - Use in documentation, never used
 * 
 * @return {result} res - Always return an object with a message and status code
 */
exports.changePassword = async (req, res, next) => {

    const { email, oudWachtwoord, nieuwWachtwoord } = req.body;

    const password_hash = await hashPassword(nieuwWachtwoord);

    db.query("SELECT * FROM ${table:name} WHERE email=${useremail}", {
        table: TABLE,
        useremail: email
    })
    .then(async result => {
        const match = await bcrypt.compare(oudWachtwoord, result[0].wachtwoord);
        if(match) {
            db.query('UPDATE ${table:name} SET wachtwoord = ${userPassword} WHERE email = ${userEmail}', {
                table: TABLE,
                userEmail: email,
                userPassword: password_hash
            }).then(result => {
                res.status(200).json({
                    passChange: true,
                });
            }).catch(error => {
                res.status(404).json({
                    error: error.message || error
                });
            });
        } else {
            res.status(200).json({
                passChange: false,
            });
        }
    })
    .catch(error => {
        res.status(404).json({
            error: error.message || error
        });
    });
};

exports.resetPassword =  async (req, res) => {
    const {email} = req.body;

    if (typeof email === 'undefined') {
        return res.status(200).json({error: true});
    }

    let password = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    for (let i = 0; i < 15; i++) {
        password += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    // TODO send password via email to user
    mailSender.sendResetMail(email, password);

    const password_hash = await hashPassword(password);

    // const password_hash = await hashPassword(password);

    db.query('UPDATE ${table:name} SET wachtwoord = ${userPassword} WHERE email = ${userEmail}', {
        table: TABLE,
        userEmail: email,
        userPassword: password_hash
    }).then(result => {
        res.status(200).json({
            reset: true,
            result: result
        });
    }).catch(error => {
        res.status(404).json({
            error: error.message || error
        });
    });
};

exports.updateUser = (req, res) => {
    const {postData, cart_id} = req.body;

    db.query('UPDATE "user" SET voornaam=${voornaam}, achternaam=${achternaam}, straatnaam=${straatnaam}, huisnummer=${huisnummer}, plaatsnaam=${plaatsnaam}, email=${email} WHERE cart_id=${cart_id}', {
        table: TABLE,
        voornaam: postData.inputVoornaam,
        achternaam: postData.inputAchternaam,
        straatnaam: postData.inputStraat,
        huisnummer: postData.inputHuisnummer,
        plaatsnaam: postData.inputPlaats,
        email: postData.inputEmail,
        cart_id: cart_id
    }).then(result => {
        res.status(200).json({
            succes: true,
            result: result
        });
    }).catch(error => {
        res.status(404).json({
            succes: false,
            error: error.message || error
        });
    });
}

exports.delete = (req, res) => {
    const {user_id} = req.body;

    db.query('DELETE FROM ${table:name} WHERE user_id=${user_id}', {
        table: TABLE,
        user_id: user_id
    }).then(result => {
        res.status(200).json({
            succes: true,
        });
    }).catch(error => {
        res.status(404).json({
            error: error.message || error
        });
    });
}