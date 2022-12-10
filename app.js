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
	console.error(username+" "+password);
    
	if (username && password) {
		connection.query('SELECT * FROM auth WHERE username = ? AND password = ?', [username, password], function(error, results, fields) {
			if (error) throw error;
            console.error(JSON.stringify(results));	
			if (results.length > 0) {
                if(results[0]['role'] === 'admin'){
				request.session.loggedin = true;
				request.session.username = username;
                
				response.redirect('/dashboard');
				}
				else{
					console.log("in else")
					request.session.loggedin = true;
					request.session.username = username;
					response.redirect(`/userdash/${username}`);
				}
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
app.get('/dashboard', async function(request, response) {
	if (request.session.loggedin) {
		let fetchedBranches;
        	await connection.query('SELECT * FROM branch', async function(error, results, fields) {
				if (error) throw error;
				
				if (results.length > 0) {
					fetchedBranches = results
					await response.render('pages/dashboard',{
						branchData: fetchedBranches
				});
				}			
				// response.end();
			});
	} else {
		console.error('Failed to render dashboard');
		response.render('/');
	}
});

app.get('/transaction/:account_number', async function(request, response) {
	let accNum = request.params.account_number;
	response.render("pages/transaction/${}",{
		account_number: accNum
	})
});

app.get('/userdash/:username', async function(request, response) {
	if (request.session.loggedin) {
		let transacs;
        	await connection.query(`SELECT * FROM customer cs inner join customer_account_access ca on cs.cust_ssn = ca.cust_ssn inner join customer_transaction ct on cs.cust_ssn=ct.cust_ssn inner join bank_account ba on ca.account_number=ba.account_number and cs.cust_ssn=${request.params.username};`, async function(error, results, fields) {
				if (error) throw error;
				
				if (results.length > 0) {
					transacs = results
					await response.render('pages/usertransactions',{
						userTransacs: transacs
					});
				}
			});
	} else {
		response.render('/');
	}
});

app.get('/bank/:id', function(request,response){
	if(request.session.loggedin){
		let accountsInBranch;
		const bankid = request.params.id
		connection.query(`SELECT c.cust_ssn, cu.cust_name, b.account_number, b.balance, b.branch_id, br.branch_name FROM customer_account_access c inner join bank_account b on b.account_number = c.account_number inner join customer cu on cu.cust_ssn = c.cust_ssn inner join branch br on br.branch_id = b.branch_id and b.branch_id=${bankid};`,  function(error, results, fields) {
			if (error) throw error;
			
			if (results.length > 0) {
				accountsInBranch = results
				console.log(accountsInBranch)
				response.render('pages/customers',{
					accounts: accountsInBranch
			});
			} else {
				response.render('pages/login');
				console.error('Incorrect Username and/or Password!');
			}			
			// response.end();
		});
	} else{
		response.render('/');
	}

})

const port = 3000;

app.listen(port, () => {
	console.log(`server is running on port ${port}`);
});