// Used libraries
const db = require('../db');
const _ = require('lodash');
const { v4:uuidv4 } = require('uuid');

// Database table name
const TABLE = 'product';

exports.getAll = (req, res, next) => {

    db.query('SELECT * FROM ${table:name}', {
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

exports.createProduct = (req, res, next) => {
    const { titel, beschrijving, prijs, voorraad, foto_path } = req.body;
    const product_id = uuidv4();

    db.query('INSERT INTO ${table:name} (${columns:name}) VALUES (${cartid})', {
        table: TABLE,
        columns: ['product_id', 'prijs', 'beschrijving', 'voorraad', 'product_foto_path', 'titel'],
        product_id: product_id,
        prijs: prijs,
        beschrijving: beschrijving,
        voorraad: voorraad,
        product_foto_path: foto_path,
        titel: titel
    })
    .then(result => {
        if(_.isEmpty(result)) {
            res.status(200).json({
                result: 'Product has been created'
            });
        }
    })
    .catch(error => {
        res.status(404).json({
            error: error.message || error
        });
    });
};