const mysql = require('mysql');
const express = require('express');
const session = require('express-session');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');

const connection = mysql.createConnection({
	host     : 'localhost',
	user     : 'root',
	password : '',
	database : 'bank_db'
});

const app = express();

app.set("view engine", "ejs");

dotenv.config();
app.use(express.json());
app.use(cors());

app.use(session({
	secret: 'secret',
	resave: true,
	saveUninitialized: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'static')));

// http://localhost:3000/
app.get('/', function(request, response) {
    
    request.session.loggedin = false;
	response.render('pages/login');
});

// http://localhost:3000/auth
app.post('/auth', function(request, response) {
    
	let username = request.body.username;
	let password = request.body.password;
    
	if (username && password) {
        
		connection.query('SELECT * FROM auth WHERE username = ? AND password = ?', [username, password], function(error, results, fields) {

			if (error) throw error;
            
			if (results.length > 0) {
                
				request.session.loggedin = true;
				request.session.username = username;
                
				response.redirect('/dashboard');
			} else {
                response.render('pages/login');
				console.error('Incorrect Username and/or Password!');
			}			
			response.end();
		});
	} else {
		response.render('pages/login');
	}
});

// http://localhost:3000/dashboard
app.get('/dashboard', function(request, response) {
	if (request.session.loggedin) {
		response.render('pages/dashboard');
	} else {
		response.render('/');
	}
	response.end();
});

const port = 3000;

app.listen(port, () => {
    console.log(`server is running on port ${port}`);
});